import { useState, useEffect, useRef } from 'react';
import MapComponent from './features/map/components/MapComponent';
import Sidebar from './features/map/components/Sidebar';
import IncidentDetail from './features/map/components/IncidentDetail';
import { getSafeRoute } from './features/map/utils/routeLogic';
import Welcome from './features/map/components/Welcome';
import API_BASE from './config';
import { Navigation, Camera, Trophy, Map, X, MapPin, ChevronUp, Loader2, AlertTriangle, Trash2, Building2, CheckCircle2, Send, Cpu, Timer, Crown, Medal, Activity, Bell, ExternalLink, Settings } from 'lucide-react';

// ─── Detect Mobile ──────────────────────────────────────────────
// ─── Detect Mobile ──────────────────────────────────────────────
const isMobileDevice = () => {
  const ua = navigator.userAgent;
  const isTouch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (!isTouch) return window.innerWidth < 600; // Only super small windows on laptop get mobile UI
  return window.innerWidth < 1024; // Tablets and phones get mobile UI
};

function App() {
  const [user, setUser] = useState(localStorage.getItem('cg_user') || '');
  const [incidents, setIncidents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [isRouting, setIsRouting] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [mobile, setMobile] = useState(isMobileDevice());

  // Route planning
  const [pickingMode, setPickingMode] = useState(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reportCoords, setReportCoords] = useState({ lat: null, lng: null });
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [smartFilter, setSmartFilter] = useState(true);

  // Mobile UI state
  const [activeTab, setActiveTab] = useState(localStorage.getItem('cg_mobile_tab') || 'map');
  const [sheetOpen, setSheetOpen] = useState(localStorage.getItem('cg_sheet_open') === 'true');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);      // { lat, lng } from browser
  const [gpsStatus, setGpsStatus] = useState('idle');    // idle | fetching | ok | error
  const [isCameraCapture, setIsCameraCapture] = useState(false); // Track if source is camera
  const [selectedFile, setSelectedFile] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const gpsWatchRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('cg_mobile_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('cg_sheet_open', sheetOpen);
  }, [sheetOpen]);

  const fetchIncidents = async (autoSelectId = null) => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents`);
      const data = await res.json();
      setIncidents(data);
      if (autoSelectId) {
        const inc = data.find(i => i.id === autoSelectId);
        if (inc) setSelectedIncident(inc);
      }
    } catch (e) { console.error(e); }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`);
      setLeaderboard(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (user) {
      fetchIncidents();
      fetchLeaderboard();
      fetch(`${API_BASE}/api/departments`).then(r => r.json()).then(setDepartments).catch(console.error);

      // Start fetching GPS in background immediately
      if ("geolocation" in navigator) {
        setGpsStatus('fetching');
        const success = (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('ok');
        };
        const error = (err) => {
          console.warn("GPS Background Error:", err);
          setGpsStatus(prev => prev === 'fetching' ? 'error' : prev);
        };
        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

        // Initial fetch
        navigator.geolocation.getCurrentPosition(success, error, options);

        // Watch for changes
        gpsWatchRef.current = navigator.geolocation.watchPosition(success, error, options);
      } else {
        setGpsStatus('error');
      }
    }

    return () => {
      if (gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current);
    };
  }, [user]);

  const handleJoin = (name) => {
    const normalized = name.trim().toUpperCase();
    setUser(normalized);
    localStorage.setItem('cg_user', normalized);
  };

  const handleMapClick = (latlng) => {
    if (!pickingMode) setSelectedIncident(null);
    const coordStr = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    if (pickingMode === 'start') { setStart(coordStr); setPickingMode(null); }
    else if (pickingMode === 'end') { setEnd(coordStr); setPickingMode(null); }
  };

  const handleMarkerClick = (incident) => {
    setSelectedIncident(incident);
    if (mobile) setSheetOpen(true);
  };

  const handleFindRoute = async () => {
    if (!start || !end) return;
    setIsRouting(true);
    try {
      const s = start.split(',').map(v => parseFloat(v.trim()));
      const e = end.split(',').map(v => parseFloat(v.trim()));
      if (s.length === 2 && e.length === 2) {
        const r = await getSafeRoute(s, e, incidents);
        setRoutes(r || []);
        if (mobile) { setSheetOpen(false); setActiveTab('map'); }
      }
    } catch (e) { console.error(e); }
    finally { setIsRouting(false); }
  };

  const handleAssign = async () => {
    if (!selectedDept || !selectedIncident) return;
    setAssigning(true);
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${selectedIncident.id}/assign`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: selectedDept })
      });
      if (res.ok) {
        fetchIncidents();
        fetchLeaderboard();
        setSelectedIncident(null);
        setSheetOpen(false);
      }
    } catch (e) { console.error(e); }
    finally { setAssigning(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    await fetch(`${API_BASE}/api/incidents/${id}`, { method: 'DELETE' });
    fetchIncidents(); setSelectedIncident(null); setSheetOpen(false);
  };

  const getRankIcon = (i) => {
    if (i === 0) return <Crown size={14} className="text-yellow-400" />;
    if (i === 1) return <Medal size={14} className="text-slate-300" />;
    if (i === 2) return <Medal size={14} className="text-amber-600" />;
    return <span className="text-[10px] text-slate-500 font-black w-3.5 text-center">{i + 1}</span>;
  };

  const filteredIncidents = (routes && routes.length > 0 && smartFilter)
    ? incidents.filter(inc => routes.some(route =>
      route.points.some(p => Math.abs(p[0] - inc.lat) < 0.004 && Math.abs(p[1] - inc.lng) < 0.004)
    ))
    : incidents;

  const getImageSrc = (inc) => {
    if (inc?.image_path) return `${API_BASE}${inc.image_path}`;
    if (inc?.type === 'pothole') return '/pothole.jpg';
    if (inc?.type === 'garbage') return '/garbage.jpg';
    return '/pothole.jpg';
  };

  const statusColor = {
    Active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Assigned: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
    Audit: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  if (!user) return <Welcome onJoin={handleJoin} />;

  // ═══════════════════════════════════════════════════════
  // DESKTOP LAYOUT
  // ═══════════════════════════════════════════════════════
  if (!mobile) {
    const desktopFindRoute = async (startStr, endStr) => {
      setIsRouting(true);
      try {
        const s = startStr.split(',').map(v => parseFloat(v.trim()));
        const e = endStr.split(',').map(v => parseFloat(v.trim()));
        if (s.length === 2 && e.length === 2) {
          const r = await getSafeRoute(s, e, incidents);
          setRoutes(r || []);
        }
      } catch (err) { console.error(err); }
      finally { setIsRouting(false); }
    };

    return (
      <div className="flex h-screen w-screen bg-slate-900 overflow-hidden relative">
        <Sidebar
          onFindRoute={desktopFindRoute}
          onClearRoute={() => { setRoutes([]); setStart(''); setEnd(''); }}
          isRouting={isRouting} hasRoute={routes.length > 0}
          pickingMode={pickingMode} setPickingMode={setPickingMode}
          start={start} setStart={setStart} end={end} setEnd={setEnd}
          reportLat={reportCoords.lat} reportLng={reportCoords.lng}
          incidents={incidents} healthScore={Math.max(0, 100 - incidents.filter(i => i.status === 'Active' || i.status === 'Assigned').length * 2)}
          onSelectIncident={setSelectedIncident} onReportSubmitted={fetchIncidents}
          setReportCoords={setReportCoords} userName={user}
        />
        <div className="flex-1 relative">
          <MapComponent routes={routes} markers={filteredIncidents}
            onMapClick={handleMapClick} onMarkerClick={handleMarkerClick}
            selectedId={selectedIncident?.id}
            center={selectedIncident?.lat ? [selectedIncident.lat, selectedIncident.lng] : mapCenter}
            startCoord={start ? start.split(',').map(s => parseFloat(s.trim())) : null}
            endCoord={end ? end.split(',').map(s => parseFloat(s.trim())) : null}
            reportCoord={reportCoords.lat ? [reportCoords.lat, reportCoords.lng] : null}
          />
          <IncidentDetail incident={selectedIncident} onClose={() => setSelectedIncident(null)} onActionComplete={fetchIncidents} departments={departments} />
          <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
            <div className="bg-slate-800/90 backdrop-blur p-2 px-4 rounded-full border border-slate-700 text-white text-sm shadow-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>Neural System Online
            </div>
            <button onClick={() => { localStorage.removeItem('cg_user'); window.location.reload(); }}
              className="bg-slate-800/90 backdrop-blur p-2 px-4 rounded-full border border-slate-700 text-slate-400 text-[10px] uppercase font-bold hover:text-white transition-all shadow-xl">
              Logout
            </button>
            {routes.length > 0 && (
              <div className="bg-slate-800/90 backdrop-blur p-2 px-4 rounded-lg border border-slate-700 shadow-xl flex items-center gap-3">
                <span className="text-xs text-slate-300 font-medium">Smart Journey View</span>
                <button onClick={() => setSmartFilter(!smartFilter)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${smartFilter ? 'bg-blue-600' : 'bg-slate-600'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${smartFilter ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // MOBILE LAYOUT — full screen map + bottom nav + sheets
  // ═══════════════════════════════════════════════════════
  return (
    <div className="h-screen w-screen bg-slate-900 overflow-hidden relative flex flex-col">

      {/* ── Full Screen Map ── */}
      <div className="flex-1 relative">
        <MapComponent
          routes={routes} markers={filteredIncidents}
          onMapClick={handleMapClick} onMarkerClick={handleMarkerClick}
          selectedId={selectedIncident?.id}
          center={selectedIncident?.lat ? [selectedIncident.lat, selectedIncident.lng] : mapCenter}
          startCoord={start ? start.split(',').map(s => parseFloat(s.trim())) : null}
          endCoord={end ? end.split(',').map(s => parseFloat(s.trim())) : null}
          reportCoord={null}
        />

        {/* ── Top Status Bar ── */}
        <div className="absolute top-0 left-0 right-0 z-[1000] flex justify-between items-center px-4 pt-4 pb-2"
          style={{ background: 'linear-gradient(to bottom, rgba(15,23,42,0.9) 0%, transparent 100%)' }}>
          <div>
            <h1 className="text-lg font-black bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent leading-none">
              Civic<span className="font-light">Guard</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">{user}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {routes.length > 0 && (
              <button onClick={() => { setRoutes([]); setStart(''); setEnd(''); }}
                className="bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-black uppercase px-3 py-1.5 rounded-full">
                Clear Route
              </button>
            )}
            <button onClick={() => { localStorage.removeItem('cg_user'); window.location.reload(); }}
              className="bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-400 text-[9px] font-black uppercase px-3 py-1.5 rounded-full">
              Logout
            </button>
          </div>
        </div>

        {/* ── Picking Mode Banner ── */}
        {pickingMode && (
          <div className="absolute top-16 left-4 right-4 z-[1000] bg-blue-600 text-white text-xs font-bold text-center py-3 rounded-2xl shadow-xl animate-pulse">
            📍 Tap on map to set {pickingMode === 'start' ? 'Start' : 'Destination'} point
          </div>
        )}

        {/* ── Stats Bar (above bottom nav) ── */}
        <div className="absolute bottom-[72px] left-4 right-4 z-[999] flex gap-2">
          {[
            { label: 'Active', val: incidents.filter(i => i.status === 'Active' || i.status === 'Assigned').length, color: 'text-red-400' },
            { label: 'Resolved', val: incidents.filter(i => i.status === 'Resolved').length, color: 'text-green-400' },
            { label: 'Health', val: `${Math.max(0, 100 - incidents.filter(i => i.status === 'Active' || i.status === 'Assigned').length * 2)}%`, color: 'text-cyan-400' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-2xl py-2 text-center">
              <div className={`text-base font-black ${s.color}`}>{s.val}</div>
              <div className="text-[8px] text-slate-500 uppercase font-black">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <div className="relative z-[1001] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: 'map', icon: <Map size={20} />, label: 'Map' },
            { id: 'route', icon: <Navigation size={20} />, label: 'Route' },
            { id: 'upload', icon: <Camera size={20} />, label: 'Report' },
            { id: 'leaderboard', icon: <Trophy size={20} />, label: 'Ranks' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSheetOpen(tab.id !== 'map');
                if (tab.id === 'map') setSelectedIncident(null);
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all min-w-[60px] ${activeTab === tab.id && sheetOpen
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-slate-500'}`}
            >
              {tab.icon}
              <span className="text-[9px] font-black uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BOTTOM SHEET — slides up over the map
      ══════════════════════════════════════════ */}
      {sheetOpen && (
        <div className="absolute inset-0 z-[1002]" onClick={() => { setSheetOpen(false); setActiveTab('map'); }}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl border-t border-slate-700 max-h-[80vh] overflow-hidden flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-slate-600 rounded-full"></div>
            </div>

            {/* Sheet Close Button */}
            <button onClick={() => { setSheetOpen(false); setActiveTab('map'); }}
              className="absolute top-4 right-4 p-1.5 bg-slate-800 rounded-full text-slate-400">
              <X size={16} />
            </button>

            {/* Sheet Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 space-y-4">

              {/* ── INCIDENT DETAIL SHEET ── */}
              {activeTab === 'map' && selectedIncident && (
                <>
                  <h2 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" /> Incident #{selectedIncident.id}
                  </h2>

                  <div className="rounded-2xl overflow-hidden aspect-video bg-slate-800">
                    <img src={getImageSrc(selectedIncident)} alt={selectedIncident.type} className="w-full h-full object-cover" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Category</div>
                      <div className="bg-slate-800 p-3 rounded-xl text-white capitalize font-bold text-sm">{selectedIncident.type}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Status</div>
                      <div className={`p-3 rounded-xl border text-[10px] font-black flex items-center gap-2 ${statusColor[selectedIncident.status] || statusColor.Active}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                        {selectedIncident.status?.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800 p-3 rounded-xl flex items-center gap-2">
                      <Cpu size={14} className="text-cyan-400 flex-shrink-0" />
                      <div>
                        <div className="text-[8px] text-slate-500 uppercase font-black">AI Confidence</div>
                        <div className="text-cyan-400 font-mono text-sm font-bold">{(selectedIncident.confidence * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-xl flex items-center gap-2">
                      <Timer size={14} className="text-slate-400 flex-shrink-0" />
                      <div>
                        <div className="text-[8px] text-slate-500 uppercase font-black">Process Time</div>
                        <div className="text-slate-300 font-mono text-sm font-bold">{selectedIncident.processing_time?.toFixed(2)}s</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 p-3 rounded-xl flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500" />
                    <span className="text-slate-400 text-xs">
                      {selectedIncident.lat && selectedIncident.lng
                        ? `${selectedIncident.lat.toFixed(5)}, ${selectedIncident.lng.toFixed(5)}`
                        : <span className="text-orange-400 font-bold">LOCATION UNKNOWN</span>}
                    </span>
                  </div>

                  {selectedIncident.status === 'Resolved' && (
                    <div className="bg-green-500/5 p-3 rounded-xl border border-green-500/20 space-y-1">
                      <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                        <CheckCircle2 size={14} /> Resolved by Department
                      </div>
                      <div className="text-green-300 text-xs">{selectedIncident.resolution_note || 'No note provided'}</div>
                    </div>
                  )}

                  {(selectedIncident.status === 'Active' || selectedIncident.status === 'Audit') && (
                    <div className="space-y-2">
                      <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white appearance-none">
                        <option value="">Assign to Department...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
                      </select>
                      <button onClick={handleAssign} disabled={!selectedDept || assigning}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-[0.98]">
                        {assigning ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                        Dispatch
                      </button>
                    </div>
                  )}

                  <button onClick={() => handleDelete(selectedIncident.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                    <Trash2 size={14} /> Delete Report
                  </button>
                </>
              )}

              {/* ── ROUTE PLANNER SHEET ── */}
              {activeTab === 'route' && (
                <>
                  <h2 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <Navigation size={16} className="text-blue-400" /> Journey Planner
                  </h2>

                  <div className="space-y-3">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-black mb-1 flex justify-between items-center">
                        <span>Departure</span>
                        <button onClick={() => { setPickingMode('start'); setSheetOpen(false); setActiveTab('map'); }}
                          className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg font-black ${pickingMode === 'start' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                          <MapPin size={10} /> Pick on Map
                        </button>
                      </div>
                      <input value={start} onChange={e => setStart(e.target.value)}
                        placeholder="lat, lng"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <div className="text-[9px] text-slate-500 uppercase font-black mb-1 flex justify-between items-center">
                        <span>Destination</span>
                        <button onClick={() => { setPickingMode('end'); setSheetOpen(false); setActiveTab('map'); }}
                          className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg font-black ${pickingMode === 'end' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                          <MapPin size={10} /> Pick on Map
                        </button>
                      </div>
                      <input value={end} onChange={e => setEnd(e.target.value)}
                        placeholder="lat, lng"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <button onClick={handleFindRoute} disabled={isRouting || !start || !end}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-4 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 active:scale-[0.98]">
                      {isRouting ? <Loader2 size={18} className="animate-spin" /> : <><Navigation size={18} className="rotate-45" /> Find Safe Route</>}
                    </button>

                    {routes.length > 0 && (
                      <button onClick={() => { setRoutes([]); setStart(''); setEnd(''); setSheetOpen(false); setActiveTab('map'); }}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700">
                        Clear Route
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ── UPLOAD / AI REPORT SHEET ── */}
              {activeTab === 'upload' && (
                <>
                  <h2 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <Camera size={16} className="text-yellow-400" /> Report a Hazard
                  </h2>

                  {/* GPS Status Banner */}
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold
                    ${gpsStatus === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                      gpsStatus === 'fetching' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse' :
                        gpsStatus === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                          'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <MapPin size={16} className="flex-shrink-0" />
                    <div>
                      {gpsStatus === 'ok' && gpsCoords ? `📍 GPS Ready: ${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}` :
                        gpsStatus === 'fetching' ? '📡 Establishing neural location...' :
                          gpsStatus === 'error' ? '⚠️ Location access restricted' :
                            'Location synchronized in background'}
                    </div>
                    {gpsStatus === 'error' && (
                      <button
                        onClick={() => {
                          setGpsStatus('fetching');
                          navigator.geolocation.getCurrentPosition(
                            (pos) => { setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ok'); },
                            () => { setGpsStatus('error'); },
                            { enableHighAccuracy: true, timeout: 5000 }
                          );
                        }}
                        className="ml-auto bg-white/20 px-2 py-1 rounded text-[9px] uppercase">Retry</button>
                    )}
                  </div>

                  {/* Selected File Preview */}
                  {selectedFile && (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                      <img src={URL.createObjectURL(selectedFile)} alt="preview" className="w-full h-40 object-cover" />
                      <div className="absolute top-2 right-2">
                        <button onClick={() => { setSelectedFile(null); if (cameraRef.current) cameraRef.current.value = ''; if (galleryRef.current) galleryRef.current.value = ''; }}
                          className="bg-slate-900/80 p-1.5 rounded-full text-slate-400">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-3">
                        <div className="text-[10px] text-slate-400 font-bold truncate">{selectedFile.name}</div>
                      </div>
                    </div>
                  )}

                  {/* Camera + Gallery Buttons */}
                  {!selectedFile && (
                    <div className="grid grid-cols-2 gap-3">

                      <button
                        onClick={() => {
                          setIsCameraCapture(true);
                          if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                            alert("⚠️ Android Chrome blocks GPS on HTTP.\n\nWORKAROUND:\n1. Open Chrome on phone\n2. Go to chrome://flags/#unsafely-treat-insecure-origin-as-secure\n3. Add http://" + window.location.hostname + ":5176 to the box\n4. Enable and Relaunch.");
                          }

                          // Use background tracker, avoid clashing requests
                          setTimeout(() => {
                            cameraRef.current?.click();
                          }, 300);
                        }}
                        className="flex flex-col items-center gap-3 bg-blue-600/20 border-2 border-blue-500/50 rounded-2xl py-8 text-blue-400 font-black active:scale-95 transition-transform">
                        <div className="p-4 bg-blue-600/30 rounded-full">
                          <Camera size={28} />
                        </div>
                        <span className="text-sm uppercase">Take Photo</span>
                        <span className="text-[9px] text-blue-500 uppercase">Use Current GPS</span>
                      </button>

                      {/* CHOOSE FROM GALLERY */}
                      <button
                        onClick={() => {
                          setIsCameraCapture(false);
                          galleryRef.current?.click();
                        }}
                        className="flex flex-col items-center gap-3 bg-slate-800 border-2 border-slate-600 rounded-2xl py-8 text-slate-400 font-black active:scale-95 transition-transform">
                        <div className="p-4 bg-slate-700 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </div>
                        <span className="text-sm uppercase">Gallery</span>
                        <span className="text-[9px] text-slate-500 uppercase">From Storage</span>
                      </button>
                    </div>
                  )}

                  {/* Hidden file inputs */}
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                    className="sr-only" onChange={e => { if (e.target.files[0]) setSelectedFile(e.target.files[0]); }} />
                  <input ref={galleryRef} type="file" accept="image/*"
                    className="sr-only" onChange={e => { if (e.target.files[0]) { setSelectedFile(e.target.files[0]); setGpsStatus('idle'); setGpsCoords(null); } }} />

                  {/* Submit Button */}
                  {selectedFile && (
                    <button
                      disabled={isSubmitting}
                      onClick={async () => {
                        setIsSubmitting(true); setTimer(0);
                        const tick = setInterval(() => setTimer(t => t + 0.1), 100);
                        const fd = new FormData();
                        fd.append('userName', user);
                        fd.append('autoLocation', 'true');
                        fd.append('image', selectedFile);
                        // Send live GPS ONLY if it's a camera capture
                        if (isCameraCapture && gpsCoords) {
                          fd.append('lat', gpsCoords.lat);
                          fd.append('lng', gpsCoords.lng);
                        }
                        try {
                          const res = await fetch(`${API_BASE}/api/report`, { method: 'POST', body: fd });
                          const d = await res.json();
                          clearInterval(tick);
                          if (res.ok) {
                            const msg = d.status === 'Audit'
                              ? `Sent to Audit:\n${d.audit_reason}`
                              : `✅ Reported!\nDetected: ${d.type}\nProcessed in ${timer.toFixed(1)}s`;
                            alert(msg);
                            setSelectedFile(null); setGpsCoords(null); setGpsStatus('idle');
                            fetchIncidents(d.id);
                            fetchLeaderboard();
                            if (d.status !== 'Audit') { setSheetOpen(false); setActiveTab('map'); }
                          } else { alert(`Error: ${d.error}`); }
                        } catch { alert('Connection failed. Is the server running?'); }
                        finally { setIsSubmitting(false); clearInterval(tick); }
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-5 rounded-2xl font-black text-base uppercase flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-900/30">
                      {isSubmitting
                        ? <><Loader2 size={20} className="animate-spin" /> Analyzing... ({timer.toFixed(1)}s)</>
                        : <><Send size={20} /> Transmit to AI</>}
                    </button>
                  )}

                  {/* Audit flagged items */}
                  {incidents.filter(i => (!i.lat || !i.lng) || (!i.department)).length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[9px] text-orange-400 font-black uppercase tracking-widest">⚠️ Flagged for Audit ({incidents.filter(i => (!i.lat || !i.lng) || (!i.department)).length})</div>
                      {incidents.filter(i => (!i.lat || !i.lng) || (!i.department)).slice(0, 3).map(inc => (
                        <div key={inc.id} onClick={() => { setSelectedIncident(inc); setActiveTab('map'); setSheetOpen(true); }}
                          className="bg-slate-800 p-3 rounded-xl border-l-4 border-l-orange-500 flex items-center gap-3 cursor-pointer active:bg-slate-700">
                          <div className="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden flex-shrink-0">
                            {inc.image_path ? <img src={getImageSrc(inc)} className="w-full h-full object-cover" /> : <Activity size={16} className="text-orange-400 m-auto mt-2" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-black text-white uppercase truncate">{inc.type}</div>
                            <div className="text-[9px] text-slate-500 truncate">{inc.audit_reason || 'Missing GPS'}</div>
                          </div>
                          <span className="text-[9px] text-orange-400 font-black">View →</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── LEADERBOARD SHEET ── */}
              {activeTab === 'leaderboard' && (
                <>
                  <h2 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" /> Agent Leaderboard
                  </h2>
                  {leaderboard.length === 0
                    ? <div className="text-center py-12 text-slate-600 text-xs font-bold uppercase">No agents ranked yet</div>
                    : <div className="space-y-2">
                      {leaderboard.map((agent, i) => (
                        <div key={agent.name}
                          className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${i === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800 border border-transparent'}
                          ${agent.name.toLowerCase() === user.toLowerCase() ? 'ring-2 ring-cyan-500/50' : ''}`}>
                          <div className="w-7 flex justify-center">{getRankIcon(i)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white uppercase truncate">{agent.name}</span>
                              {agent.name.toLowerCase() === user.toLowerCase() && (
                                <span className="text-[7px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">You</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-green-400">{agent.points}</span>
                            <span className="text-[9px] text-slate-500 ml-1 uppercase">pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
