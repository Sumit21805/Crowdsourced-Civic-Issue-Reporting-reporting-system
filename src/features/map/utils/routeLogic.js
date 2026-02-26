import polyline from '@mapbox/polyline';

/**
 * Rigorous Haversine Distance Calculation (km)
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Interpolates points in a geometry to ensure we don't 'jump' over hazards
 */
const interpolatePoints = (points) => {
    const interpolated = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        interpolated.push(p1);
        const dist = getDistance(p1[0], p1[1], p2[0], p2[1]);
        if (dist > 0.05) { // Segment > 50m
            const steps = Math.min(Math.floor(dist / 0.05), 50); // Cap interpolation to prevent memory boom
            for (let s = 1; s < steps; s++) {
                interpolated.push([
                    p1[0] + (p2[0] - p1[0]) * (s / steps),
                    p1[1] + (p2[1] - p1[1]) * (s / steps)
                ]);
            }
        }
    }
    interpolated.push(points[points.length - 1]);
    return interpolated;
};

/**
 * Evaluates route safety based on 500m danger zones and proximity maximization
 */
const evaluateSafety = (geometry, markers) => {
    const rawPoints = polyline.decode(geometry);
    const points = interpolatePoints(rawPoints);
    let totalPenalty = 0;
    let pointsInZone = 0;
    let hitMarkerIds = new Set();

    points.forEach(p => {
        let nearestDist = Infinity;
        let nearestMarker = null;

        markers.forEach(m => {
            const d = getDistance(p[0], p[1], m.lat, m.lng);
            if (d < nearestDist) {
                nearestDist = d;
                nearestMarker = m;
            }
        });

        if (nearestDist < 0.51) { // 500m Radius Zone (plus tiny buffer)
            pointsInZone++;
            if (nearestMarker) hitMarkerIds.add(nearestMarker.id);
            // MASSIVE PENALTY: 100M base for any entry + exponential proximity cost
            totalPenalty += 100000000 + (Math.pow(0.5 - nearestDist, 2) * 5000000);
        } else {
            // Buffer Priority: Heavily penalize closeness up to 1.5km to find the furthest road
            totalPenalty += Math.pow(Math.max(0, 1.5 - nearestDist), 2) * 50000;
        }
    });

    return {
        points: rawPoints,
        penalty: totalPenalty,
        isDirty: pointsInZone > 0,
        dangerCount: hitMarkerIds.size
    };
};

export const getSafeRoute = async (start, end, markers) => {
    const startStr = `${start[1]},${start[0]}`;
    const endStr = `${end[1]},${end[0]}`;
    const validMarkers = markers.filter(m => m.lat && m.lng);

    const fetchOSRM = async (wpQuery) => {
        try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${wpQuery}?overview=full&alternatives=true&geometries=polyline`);
            const d = await res.json();
            return d.code === 'Ok' ? d.routes : [];
        } catch (e) { return []; }
    };

    try {
        let candidates = [];

        // 1. Core Discovery (Direct & OSRM Alternatives)
        const directRes = await fetchOSRM(`${startStr};${endStr}`);
        directRes.forEach(r => {
            candidates.push({ ...r, ...evaluateSafety(r.geometry, validMarkers), source: 'Direct' });
        });

        // 2. Wide-Area Arterial Discovery (Searching for parallel roads like the ones you circled)
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;

        // Try waypoints 2.5km to the sides to 'discover' major parallel arteries
        const offsets = [[0.02, 0.02], [-0.02, -0.02], [0.02, -0.02], [-0.02, 0.02]];
        const discoveryPromises = offsets.map(off =>
            fetchOSRM(`${startStr};${midLng + off[1]},${midLat + off[0]};${endStr}`)
        );
        const discoveryResults = await Promise.all(discoveryPromises);
        discoveryResults.flat().forEach(r => {
            candidates.push({ ...r, ...evaluateSafety(r.geometry, validMarkers), source: 'Discovery' });
        });

        // 3. Multi-Hazard Detours (Surgical bypass of detected threats)
        let currentBest = [...candidates].sort((a, b) => a.penalty - b.penalty)[0];
        if (currentBest && currentBest.isDirty) {
            const hitHazards = validMarkers.filter(m =>
                interpolatePoints(polyline.decode(currentBest.geometry)).some(p => getDistance(p[0], p[1], m.lat, m.lng) < 0.5)
            );

            const detourPromises = [];
            hitHazards.slice(0, 3).forEach(target => {
                const bOffsets = [[0.015, 0.015], [-0.015, -0.015], [0.015, -0.015], [-0.015, 0.015]];
                bOffsets.forEach(off => {
                    detourPromises.push(fetchOSRM(`${startStr};${target.lng + off[1]},${target.lat + off[0]};${endStr}`));
                });
            });
            const dResults = await Promise.all(detourPromises);
            dResults.flat().forEach(r => {
                candidates.push({ ...r, ...evaluateSafety(r.geometry, validMarkers), source: 'Detour' });
            });
        }

        // ── FINAL SELECTION ──
        // FASTEST: ignores all hazard logic
        const fastest = [...candidates].filter(c => c.source === 'Direct').sort((a, b) => a.duration - b.duration)[0] || candidates[0];

        // SAFEST: prioritize absolute minimum penalty
        const safest = [...candidates].sort((a, b) => {
            if (a.penalty !== b.penalty) return a.penalty - b.penalty;
            return a.duration - b.duration;
        })[0];

        const format = (r, type, isRec) => ({
            points: r.points, distance: r.distance, duration: r.duration,
            dangerScore: r.dangerCount, type, isRecommended: isRec
        });

        if (safest === fastest || (safest.penalty === fastest.penalty && safest.duration === fastest.duration)) {
            return [format(safest, 'Safest & Fastest', true)];
        }

        return [format(safest, 'Safest', true), format(fastest, 'Fastest', false)];

    } catch (e) { console.error(e); return null; }
};
