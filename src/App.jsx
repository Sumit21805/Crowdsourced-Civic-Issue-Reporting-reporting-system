import { useState, useEffect } from 'react';
import Sidebar from './features/map/components/Sidebar';
import MapComponent from './features/map/components/MapComponent';
import { getSafeRoute } from './features/map/utils/routeLogic';
import IncidentDetail from './features/map/components/IncidentDetail';
import Welcome from './features/map/components/Welcome';

function App() {
  const [user, setUser] = useState(localStorage.getItem('cg_user') || '');
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
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);

  const fetchIncidents = async (autoSelectId = null) => {
    try {
      const response = await fetch('http://localhost:5000/api/incidents');
      const data = await response.json();
      setIncidents(data);

      if (autoSelectId) {
        const newIncident = data.find(i => i.id === autoSelectId);
        if (newIncident) {
          setSelectedIncident(newIncident);
        }
      }
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchIncidents();
    }
  }, [user]);

  const handleJoin = (name) => {
    setUser(name);
    localStorage.setItem('cg_user', name);
  };

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
  const filteredIncidents = (routes && routes.length > 0 && smartFilter)
    ? incidents.filter(incident => {
      const threshold = 0.004;
      return routes.some(route =>
        route.points.some(p => {
          const dLat = Math.abs(p[0] - incident.lat);
          const dLng = Math.abs(p[1] - incident.lng);
          return dLat < threshold && dLng < threshold;
        })
      );
    })
    : incidents;

  if (!user) {
    return <Welcome onJoin={handleJoin} />;
  }

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
        incidents={incidents}
        healthScore={Math.max(0, 100 - incidents.length * 2)}
        onSelectIncident={setSelectedIncident}
        onReportSubmitted={fetchIncidents}
        setReportCoords={setReportCoords}
        userName={user}
      />

      <div className="flex-1 relative">
        <MapComponent
          routes={routes}
          markers={filteredIncidents}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
          selectedId={selectedIncident?.id}
          center={selectedIncident ? [selectedIncident.lat, selectedIncident.lng] : mapCenter}
          startCoord={start ? start.split(',').map(s => parseFloat(s.trim())) : null}
          endCoord={end ? end.split(',').map(s => parseFloat(s.trim())) : null}
          reportCoord={reportCoords.lat ? [reportCoords.lat, reportCoords.lng] : null}
        />

        <IncidentDetail
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onActionComplete={fetchIncidents}
        />

        {/* Floating status & Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
          <div className="bg-slate-800/90 backdrop-blur p-2 px-4 rounded-full border border-slate-700 text-white text-sm shadow-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Neural System Online
          </div>

          <button
            onClick={() => { localStorage.removeItem('cg_user'); window.location.reload(); }}
            className="bg-slate-800/90 backdrop-blur p-2 px-4 rounded-full border border-slate-700 text-slate-400 text-[10px] uppercase font-bold hover:text-white transition-all shadow-xl"
          >
            Logout
          </button>

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
