import polyline from '@mapbox/polyline';

/**
 * Fetches routes from OSRM and calculates a 'Danger Score'
 * @param {Array} start - [lat, lng]
 * @param {Array} end - [lat, lng]
 * @param {Array} markers - Current potholes/hazards
 */
export const getSafeRoute = async (start, end, markers) => {
    const startStr = `${start[1]},${start[0]}`;
    const endStr = `${end[1]},${end[0]}`;

    // Only consider markers with valid coordinates
    const validMarkers = markers.filter(m => m.lat && m.lng);

    // Only exclude hazards right at the start/end intersection (you can't avoid your own location)
    const intersectionRadius = 0.001; // ~100m — just the immediate intersection
    const routeHazards = validMarkers.filter(m => {
        const atStart = Math.abs(m.lat - start[0]) < intersectionRadius &&
            Math.abs(m.lng - start[1]) < intersectionRadius;
        const atEnd = Math.abs(m.lat - end[0]) < intersectionRadius &&
            Math.abs(m.lng - end[1]) < intersectionRadius;
        return !atStart && !atEnd; // Exclude ONLY hazards right at your pin
    });

    // Helper to calculate danger score for a geometry
    const calculateDanger = (geometry) => {
        const points = polyline.decode(geometry);
        let dangerPoints = 0;
        const threshold = 0.002; // ~200 meters — avoid route if hazard within 200m

        routeHazards.forEach(marker => {
            const isNear = points.some(p =>
                Math.abs(p[0] - marker.lat) < threshold &&
                Math.abs(p[1] - marker.lng) < threshold
            );
            if (isNear) dangerPoints++;
        });
        return { points, score: dangerPoints };
    };

    // Try a detour route via a waypoint
    const tryDetour = async (waypointLat, waypointLng) => {
        const wpStr = `${waypointLng},${waypointLat}`;
        const url = `https://router.project-osrm.org/route/v1/driving/${startStr};${wpStr};${endStr}?overview=full&geometries=polyline`;
        try {
            const res = await fetch(url);
            const d = await res.json();
            if (d.code === 'Ok') {
                const route = d.routes[0];
                const { points, score } = calculateDanger(route.geometry);
                return {
                    points,
                    distance: route.distance,
                    duration: route.duration,
                    dangerScore: score,
                    type: 'Safe Detour',
                    isRecommended: false
                };
            }
        } catch (e) { /* ignore failed detour */ }
        return null;
    };

    try {
        // 1. Get initial routes (up to 3 alternatives)
        const primaryUrl = `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&alternatives=true&geometries=polyline`;
        const response = await fetch(primaryUrl);
        const data = await response.json();
        if (data.code !== 'Ok') throw new Error('Routing failed');

        let allRoutes = data.routes.map((r, i) => {
            const { points, score } = calculateDanger(r.geometry);
            return {
                points,
                distance: r.distance,
                duration: r.duration,
                dangerScore: score,
                type: i === 0 ? 'Fastest' : 'Alternative',
                isRecommended: false
            };
        });

        // 2. Intelligence: If the fastest route has mid-route hazards, try detours
        const fastest = allRoutes[0];
        if (fastest.dangerScore > 0) {
            // Find which hazards are near the route
            const threshold = 0.003;
            const nearbyHazards = routeHazards.filter(marker =>
                fastest.points.some(p =>
                    Math.abs(p[0] - marker.lat) < threshold &&
                    Math.abs(p[1] - marker.lng) < threshold
                )
            );

            const detourShifts = [
                { dlat: 0.012, dlng: 0 },
                { dlat: -0.012, dlng: 0 },
                { dlat: 0, dlng: 0.012 },
                { dlat: 0, dlng: -0.012 },
            ];

            const detourPromises = [];

            // Detours away from each hazard
            for (const hazard of nearbyHazards) {
                for (const shift of detourShifts) {
                    detourPromises.push(tryDetour(hazard.lat + shift.dlat, hazard.lng + shift.dlng));
                }
            }

            // Midpoint detours
            const midIndex = Math.floor(fastest.points.length / 2);
            const midPoint = fastest.points[midIndex];
            for (const shift of detourShifts) {
                detourPromises.push(tryDetour(midPoint[0] + shift.dlat, midPoint[1] + shift.dlng));
            }

            const detourResults = await Promise.all(detourPromises);
            detourResults.forEach(route => {
                if (route) allRoutes.push(route);
            });
        }

        // 3. Final Selection: Sort by Safety FIRST, then fastest time
        const sorted = [...allRoutes].sort((a, b) => {
            if (a.dangerScore !== b.dangerScore) return a.dangerScore - b.dangerScore;
            return a.duration - b.duration;
        });

        // If all routes have the same danger score, only show the fastest
        const allSameDanger = sorted.every(r => r.dangerScore === sorted[0].dangerScore);
        if (allSameDanger) {
            sorted[0].isRecommended = true;
            sorted[0].type = 'Safest & Fastest';
            return [sorted[0]];
        }

        // Otherwise, show safest (recommended) + fastest only (exactly 2 routes max)
        sorted[0].isRecommended = true;
        sorted[0].type = 'Safest';
        const quickest = [...allRoutes].sort((a, b) => a.duration - b.duration)[0];
        if (quickest !== sorted[0]) {
            quickest.type = 'Fastest';
            return [sorted[0], quickest]; // Exactly 2: safest + fastest
        }
        return [sorted[0]]; // They're the same route
    } catch (error) {
        console.error("Routing Error:", error);
        return null;
    }
};
