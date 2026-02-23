import { useState, useEffect } from 'react';
import { MapPin, Navigation, Settings, Loader2, ChevronLeft, ChevronRight, Layout, AlertCircle, Bell, Activity, Trophy, Crown, Medal } from 'lucide-react';
import API_BASE from '../../../config';

const Sidebar = ({ onFindRoute, onClearRoute, isRouting, hasRoute, pickingMode, setPickingMode, start, setStart, end, setEnd, reportLat, reportLng, incidents = [], healthScore, onSelectIncident, onReportSubmitted, setReportCoords, userName }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timer, setTimer] = useState(0);
    const [tab, setTab] = useState('map');
    const [leaderboard, setLeaderboard] = useState([]);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/leaderboard`);
            const data = await res.json();
            setLeaderboard(data);
        } catch (err) {
            console.error("Leaderboard fetch error:", err);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [incidents]); // Refetch when incidents change (new report submitted)

    const handleSubmit = (e) => {
        e.preventDefault();
        if (start && end) {
            onFindRoute(start, end);
        }
    };

    const getRankIcon = (index) => {
        if (index === 0) return <Crown size={14} className="text-yellow-400" />;
        if (index === 1) return <Medal size={14} className="text-slate-300" />;
        if (index === 2) return <Medal size={14} className="text-amber-600" />;
        return <span className="text-[10px] text-slate-500 font-black w-3.5 text-center">{index + 1}</span>;
    };

    return (
        <div className={`h-full ${isCollapsed ? 'w-16' : 'w-80'} bg-slate-900 text-white flex flex-col shadow-2xl z-20 relative transition-all duration-300 ease-in-out border-r border-slate-700`}>
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 bg-blue-600 hover:bg-blue-500 text-white p-1 rounded-full shadow-lg z-50 transition-transform active:scale-90"
            >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Header */}
            <div className={`p-6 border-b border-slate-700 ${isCollapsed ? 'items-center px-0 flex justify-center' : ''}`}>
                {isCollapsed ? (
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform cursor-pointer" onClick={() => setIsCollapsed(false)}>
                        <Layout size={20} className="text-white" />
                    </div>
                ) : (
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                                Civic<span className="font-light">Guard</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black truncate max-w-[120px]">{userName}</span>
                            </div>
                        </div>
                        <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700 flex gap-1">
                            <button onClick={() => setTab('map')} className={`p-1.5 rounded ${tab === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Strategic Map"><Activity size={14} /></button>
                            <button onClick={() => setTab('audit')} className={`p-1.5 rounded ${tab === 'audit' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Audit & Upload"><Bell size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            {!isCollapsed && (
                <div className="flex-1 p-4 space-y-6 overflow-auto scrollbar-thin scrollbar-thumb-slate-700">

                    {/* ========== MAP TAB ========== */}
                    {tab === 'map' && (
                        <>
                            {/* Route Planning */}
                            <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                    <Navigation size={14} className="text-blue-400" /> Journey Planner
                                </h2>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase ml-1 flex justify-between items-center font-bold">
                                            Departure Location
                                            <button type="button" onClick={() => setPickingMode(pickingMode === 'start' ? null : 'start')} className={`p-1 rounded transition-all ${pickingMode === 'start' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}><MapPin size={14} /></button>
                                        </label>
                                        <input type="text" value={start} onChange={(e) => setStart(e.target.value)} placeholder="Click pin to pick..." className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase ml-1 flex justify-between items-center font-bold">
                                            Destination
                                            <button type="button" onClick={() => setPickingMode(pickingMode === 'end' ? null : 'end')} className={`p-1 rounded transition-all ${pickingMode === 'end' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}><MapPin size={14} /></button>
                                        </label>
                                        <input type="text" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="Click pin to pick..." className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="flex flex-col gap-2 pt-2">
                                        <button type="submit" disabled={isRouting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                                            {isRouting ? <Loader2 className="animate-spin" size={18} /> : <><Navigation size={18} className="rotate-45" /> Find Safe Route</>}
                                        </button>
                                        {hasRoute && <button type="button" onClick={onClearRoute} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700">Clear Path</button>}
                                    </div>
                                </div>
                            </form>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 text-center">
                                    <div className="text-lg font-black text-red-500 tracking-tighter">{incidents.filter(i => i.status === 'Active' || i.status === 'Assigned').length}</div>
                                    <div className="text-[8px] text-slate-500 uppercase font-black">Active</div>
                                </div>
                                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 text-center">
                                    <div className="text-lg font-black text-green-500 tracking-tighter">{incidents.filter(i => i.status === 'Resolved').length}</div>
                                    <div className="text-[8px] text-slate-500 uppercase font-black">Resolved</div>
                                </div>
                                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 text-center">
                                    <div className="text-lg font-black text-green-500 tracking-tighter">{healthScore}%</div>
                                    <div className="text-[8px] text-slate-500 uppercase font-black">Health</div>
                                </div>
                            </div>

                            {/* Leaderboard */}
                            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                    <Trophy size={14} className="text-yellow-500" /> Agent Leaderboard
                                </h2>
                                {leaderboard.length === 0 ? (
                                    <div className="text-center py-6 text-slate-600 text-xs font-bold uppercase">No agents ranked yet</div>
                                ) : (
                                    <div className="space-y-2">
                                        {leaderboard.map((agent, index) => (
                                            <div
                                                key={agent.name}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${index === 0
                                                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                                                    : 'bg-slate-900/50 border border-transparent hover:border-slate-700'
                                                    } ${agent.name.toLowerCase() === userName.toLowerCase() ? 'ring-1 ring-cyan-500/50' : ''}`}
                                            >
                                                <div className="w-6 flex justify-center">
                                                    {getRankIcon(index)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-black text-white uppercase truncate">{agent.name}</span>
                                                        {agent.name.toLowerCase() === userName.toLowerCase() && (
                                                            <span className="text-[7px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">You</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-green-400">{agent.points}</span>
                                                    <span className="text-[8px] text-slate-500 ml-1 uppercase">pts</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ========== AUDIT TAB ========== */}
                    {tab === 'audit' && (
                        <div className="space-y-4">
                            {/* Audit Logs */}
                            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400 flex items-center justify-between px-2">
                                <div className="flex items-center gap-2"><Bell size={14} /> Neural Audit Logs</div>
                                <span className="bg-orange-500/20 px-2 py-0.5 rounded-full text-[10px]">{incidents.filter(inc => (!inc.lat || !inc.lng) || (!inc.department)).length}</span>
                            </h2>
                            {incidents.filter(inc => (!inc.lat || !inc.lng) || (!inc.department)).length === 0 ? (
                                <div className="text-center py-6 text-slate-600 text-xs font-bold uppercase">No Alerts Flagged</div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                    {incidents.filter(inc => (!inc.lat || !inc.lng) || (!inc.department)).map(inc => (
                                        <div
                                            key={inc.id}
                                            onClick={() => onSelectIncident(inc)}
                                            className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 hover:border-orange-500/50 transition-all cursor-pointer flex items-center gap-3 group border-l-4 border-l-orange-500"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-orange-500 overflow-hidden ring-1 ring-white/10">
                                                {inc.image_path ? <img src={`${API_BASE}${inc.image_path}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /> : <AlertCircle size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-white uppercase">{inc.type}</span>
                                                    <span className="text-[8px] text-orange-400 font-bold bg-orange-400/10 px-1.5 py-0.5 rounded">AUDIT</span>
                                                </div>
                                                <div className="text-[9px] text-slate-500 font-medium truncate">{inc.audit_reason || 'Missing GPS Data'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* AI Report Sync — ONLY in Audit tab */}
                            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <Activity size={14} className="text-yellow-500" /> AI Report Sync
                                    </h2>
                                </div>

                                <form className="space-y-4" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target;
                                    const imageFile = form.image.files[0];
                                    if (!imageFile) {
                                        alert("Please select an evidence JPG!");
                                        return;
                                    }

                                    setIsSubmitting(true);
                                    setTimer(0);
                                    const timerInterval = setInterval(() => setTimer(t => t + 0.1), 100);

                                    const formData = new FormData();
                                    formData.append('userName', userName);
                                    formData.append('autoLocation', 'false');
                                    formData.append('image', imageFile);

                                    try {
                                        const response = await fetch(`${API_BASE}/api/report`, {
                                            method: 'POST',
                                            body: formData,
                                        });

                                        const resData = await response.json();
                                        clearInterval(timerInterval);

                                        if (response.ok) {
                                            if (resData.status === 'Audit') {
                                                alert(`Processed in ${timer.toFixed(1)}s. SENT TO AUDIT: ${resData.audit_reason}`);
                                                setTab('audit');
                                                onReportSubmitted();
                                            } else {
                                                alert(`Processed in ${timer.toFixed(1)}s. SYNCED TO CITY BRAIN!`);
                                                setTab('map');
                                                onReportSubmitted(resData.id);
                                            }
                                            form.reset();
                                        } else {
                                            alert(`System Error: ${resData.error || 'Check connectivity'}`);
                                        }
                                    } catch (error) {
                                        console.error("API error:", error);
                                        alert("Neural link failure.");
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 uppercase ml-1 font-bold tracking-widest">Evidence (.JPG)</label>
                                        <input
                                            type="file"
                                            name="image"
                                            accept=".jpg,.jpeg"
                                            className="w-full text-[10px] text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 transition-all cursor-pointer bg-slate-900/50 p-2 rounded-xl border border-dashed border-slate-700"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-slate-100 hover:bg-white text-slate-900 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Syncing ({timer.toFixed(1)}s)
                                            </>
                                        ) : 'Transmit to Neural Center'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className={`p-4 border-t border-slate-700 ${isCollapsed ? 'px-0 flex justify-center' : ''}`}>
                <button onClick={() => window.open('/admin.html', '_blank')} className={`flex items-center gap-3 text-slate-500 hover:text-amber-400 transition-colors w-full rounded-lg hover:bg-amber-500/5 ${isCollapsed ? 'justify-center p-2' : 'p-3'}`}>
                    <Settings size={isCollapsed ? 20 : 18} className="transition-transform hover:rotate-90" />
                    {!isCollapsed && <span className="text-[11px] font-bold uppercase tracking-widest">Admin Portal</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
