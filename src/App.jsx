import { useState, useEffect } from 'react';
import Sidebar from './features/map/components/Sidebar';
import MapComponent from './features/map/components/MapComponent';
import { getSafeRoute } from './features/map/utils/routeLogic';
import IncidentDetail from './features/map/components/IncidentDetail';

function App() {
  const [incidents, setIncidents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isRouting, setIsRouting] = useState(false);

  // Selection State
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Phase 6: Smart Filtering State
  const [smartFilter, setSmartFilter] = useState(true);

  // Interactive Picking State
  const [pickingMode, setPickingMode] = useState(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reportCoords, setReportCoords] = useState({ lat: null, lng: null });

  // Fetch incidents from backend
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch('http://192.168.1.7:5000/api/incidents');
        const data = await response.json();
        setIncidents(data);
      } catch (error) {
        console.error("Failed to fetch incidents:", error);
      }
    };
    fetchIncidents();
    // REMOVED: Auto-refresh interval that was causing "popping" pins
  }, []);

  const handleMapClick = (latlng) => {
    if (!pickingMode) setSelectedIncident(null);

    const coordStr = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;

    if (pickingMode === 'start') {
      setStart(coordStr);
      setPickingMode(null);
    } else if (pickingMode === 'end') {
      setEnd(coordStr);
      setPickingMode(null);
    } else if (pickingMode === 'report') {
      setReportCoords({ lat: latlng.lat, lng: latlng.lng });
    }
  };

  const handleMarkerClick = (incident) => {
    setSelectedIncident(incident);
  };

  const handleFindRoute = async (startStr, endStr) => {
    setIsRouting(true);
    try {
      const startArr = startStr.split(',').map(s => parseFloat(s.trim()));
      const endArr = endStr.split(',').map(s => parseFloat(s.trim()));

      if (startArr.length === 2 && endArr.length === 2) {
        const calculatedRoutes = await getSafeRoute(startArr, endArr, incidents);
        setRoutes(calculatedRoutes || []);
      }
    } catch (error) {
      console.error("Routing error:", error);
    } finally {
      setIsRouting(false);
    }
  };

  const handleClearRoute = () => {
    setRoutes([]);
    setStart('');
    setEnd('');
    setSelectedIncident(null);
  };

  // Phase 6: Route-Based Pin Filtering
  // If routes exist AND smartFilter is on, only show incidents near those routes. Otherwise show all.
  const filteredIncidents = (routes && routes.length > 0 && smartFilter)
    ? incidents.filter(incident => {
      const threshold = 0.004; // Increased from 0.001 to approx 400m to show "nearby" hazards
      return routes.some(route =>
        route.points.some(p => {
          const dLat = Math.abs(p[0] - incident.lat);
          const dLng = Math.abs(p[1] - incident.lng);
          return dLat < threshold && dLng < threshold;
        })
      );
    })
    : incidents;

  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden relative">
      <Sidebar
        onFindRoute={handleFindRoute}
        onClearRoute={handleClearRoute}
        isRouting={isRouting}
        hasRoute={routes.length > 0}
        pickingMode={pickingMode}
        setPickingMode={setPickingMode}
        start={start}
        setStart={setStart}
        end={end}
        setEnd={setEnd}
        reportLat={reportCoords.lat}
        reportLng={reportCoords.lng}
        incidentCount={incidents.length}
        healthScore={Math.max(0, 100 - incidents.length * 2)}
      />

      <div className="flex-1 relative">
        <MapComponent
          routes={routes}
          markers={filteredIncidents}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
          selectedId={selectedIncident?.id}
          startCoord={start ? start.split(',').map(s => parseFloat(s.trim())) : null}
          endCoord={end ? end.split(',').map(s => parseFloat(s.trim())) : null}
          reportCoord={reportCoords.lat ? [reportCoords.lat, reportCoords.lng] : null}
        />

        <IncidentDetail
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />

        {/* Floating status & Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
          <div className="bg-slate-800/90 backdrop-blur p-2 px-4 rounded-full border border-slate-700 text-white text-sm shadow-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            System Online
          </div>

          {/* Toggle Switch - Only show if a route is active */}
          {routes.length > 0 && (
            <div className="bg-slate-800/90 backdrop-blur p-2 px-4 rounded-lg border border-slate-700 shadow-xl flex items-center gap-3">
              <span className="text-xs text-slate-300 font-medium">Smart Journey View</span>
              <button
                onClick={() => setSmartFilter(!smartFilter)}
                className={`w-10 h-5 rounded-full transition-colors relative ${smartFilter ? 'bg-blue-600' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${smartFilter ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
