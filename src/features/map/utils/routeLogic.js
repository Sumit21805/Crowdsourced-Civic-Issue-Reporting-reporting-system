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

    // Helper to calculate danger score for a geometry
    const calculateDanger = (geometry) => {
        const points = polyline.decode(geometry);
        let dangerPoints = 0;
        const threshold = 0.0006; // ~60 meters

        markers.forEach(marker => {
            const isNear = points.some(p =>
                Math.abs(p[0] - marker.lat) < threshold &&
                Math.abs(p[1] - marker.lng) < threshold
            );
            if (isNear) dangerPoints++;
        });
        return { points, score: dangerPoints };
    };

    try {
        // 1. Get initial routes (up to 3)
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

        // 2. Intelligence: If the fastest route has hazards, try to FORCE a detour
        const fastest = allRoutes[0];
        if (fastest.dangerScore > 0) {
            // Find a mid-point on the route to perturb
            const midIndex = Math.floor(fastest.points.length / 2);
            const midPoint = fastest.points[midIndex];

            // Create a detour waypoint by shifting the mid-point slightly (approx 1km)
            // Shift Latitude by 0.01 degrees (~1.1km)
            const detourLat = midPoint[0] + 0.008;
            const detourLng = midPoint[1] + 0.008;
            const detourStr = `${detourLng},${detourLat}`;

            const detourUrl = `https://router.project-osrm.org/route/v1/driving/${startStr};${detourStr};${endStr}?overview=full&geometries=polyline`;
            const dResponse = await fetch(detourUrl);
            const dData = await dResponse.json();

            if (dData.code === 'Ok') {
                const dRoute = dData.routes[0];
                const { points, score } = calculateDanger(dRoute.geometry);
                allRoutes.push({
                    points,
                    distance: dRoute.distance,
                    duration: dRoute.duration,
                    dangerScore: score,
                    type: 'Safe Detour',
                    isRecommended: false
                });
            }
        }

        // 3. Final Selection: Sort by Safety FIRST, then distance
        const sorted = [...allRoutes].sort((a, b) => {
            if (a.dangerScore !== b.dangerScore) return a.dangerScore - b.dangerScore;
            return a.distance - b.distance;
        });

        sorted[0].isRecommended = true;
        return sorted;
    } catch (error) {
        console.error("Routing Error:", error);
        return null;
    }
};
