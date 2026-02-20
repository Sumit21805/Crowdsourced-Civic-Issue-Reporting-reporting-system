import { useState } from 'react';
import { MapPin, Navigation, Settings, Loader2, ChevronLeft, ChevronRight, Layout } from 'lucide-react';

const Sidebar = ({ onFindRoute, onClearRoute, isRouting, hasRoute, pickingMode, setPickingMode, start, setStart, end, setEnd, reportLat, reportLng, incidentCount, healthScore }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (start && end) {
            onFindRoute(start, end);
        }
    };

    return (
        <div className={`h-full ${isCollapsed ? 'w-16' : 'w-80'} bg-slate-900 text-white flex flex-col shadow-2xl z-20 relative transition-all duration-300 ease-in-out border-r border-slate-700`}>
            {/* Collapse Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 bg-blue-600 hover:bg-blue-500 text-white p-1 rounded-full shadow-lg z-50 transition-transform active:scale-90"
            >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Header / Logo Area */}
            <div className={`p-6 border-b border-slate-700 ${isCollapsed ? 'items-center px-0 flex justify-center' : ''}`}>
                {isCollapsed ? (
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform cursor-pointer" onClick={() => setIsCollapsed(false)}>
                        <Layout size={20} className="text-white" />
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                            Civic<span className="font-light">Guard</span>
                        </h1>
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">Smart City Intelligence</p>
                    </>
                )}
            </div>

            {!isCollapsed && (
                <div className="flex-1 p-4 space-y-6 overflow-auto scrollbar-thin scrollbar-thumb-slate-700">
                    {/* Route Planning Section */}
                    <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            <Navigation size={14} className="text-blue-400" /> Journey Planner
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase ml-1 flex justify-between items-center font-bold">
                                    Departure Location
                                    <button
                                        type="button"
                                        onClick={() => setPickingMode(pickingMode === 'start' ? null : 'start')}
                                        className={`p-1 rounded transition-all ${pickingMode === 'start' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <MapPin size={14} />
                                    </button>
                                </label>
                                <input
                                    type="text"
                                    value={start}
                                    onChange={(e) => setStart(e.target.value)}
                                    placeholder="Click pin to pick..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase ml-1 flex justify-between items-center font-bold">
                                    Destination
                                    <button
                                        type="button"
                                        onClick={() => setPickingMode(pickingMode === 'end' ? null : 'end')}
                                        className={`p-1 rounded transition-all ${pickingMode === 'end' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <MapPin size={14} />
                                    </button>
                                </label>
                                <input
                                    type="text"
                                    value={end}
                                    onChange={(e) => setEnd(e.target.value)}
                                    placeholder="Click pin to pick..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={isRouting}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                                >
                                    {isRouting ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            <Navigation size={18} className="rotate-45" />
                                            Find Safe Route
                                        </>
                                    )}
                                </button>
                                {hasRoute && (
                                    <button
                                        type="button"
                                        onClick={onClearRoute}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700"
                                    >
                                        Clear Path
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 text-center">
                            <div className="text-xl font-black text-red-500 tracking-tighter">{incidentCount}</div>
                            <div className="text-[9px] text-slate-500 uppercase font-black">Hazards</div>
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 text-center">
                            <div className="text-xl font-black text-green-500 tracking-tighter">{healthScore}%</div>
                            <div className="text-[9px] text-slate-500 uppercase font-black">Health</div>
                        </div>
                    </div>

                    {/* Reporting Portal */}
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            <MapPin size={14} className="text-yellow-500" /> Live Report
                        </h2>

                        <div className="mb-4 bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-slate-500 uppercase font-bold">Targeted Location</span>
                                <span className="text-[10px] text-blue-400 font-mono font-bold truncate max-w-[140px]">
                                    {reportLat ? `${reportLat.toFixed(4)}, ${reportLng.toFixed(4)}` : 'Awaiting Map Selection...'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPickingMode(pickingMode === 'report' ? null : 'report')}
                                className={`p-2 rounded-lg transition-all ${pickingMode === 'report' ? 'text-yellow-400 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'text-slate-500 hover:bg-slate-700'}`}
                            >
                                <MapPin size={16} />
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={async (e) => {
                            e.preventDefault();
                            if (!reportLat || !reportLng) {
                                alert("Please click on map to pin location first!");
                                return;
                            }

                            const form = e.target;
                            const formData = new FormData();
                            formData.append('type', form.type.value);
                            formData.append('lat', reportLat);
                            formData.append('lng', reportLng);
                            formData.append('severity', 'Medium');

                            const imageFile = form.image.files[0];
                            if (imageFile) {
                                formData.append('image', imageFile);
                            }

                            try {
                                const response = await fetch('http://192.168.1.7:5000/api/report', {
                                    method: 'POST',
                                    body: formData,
                                });

                                if (response.ok) {
                                    alert("Report processed into City Brain!");
                                    window.location.reload();
                                } else {
                                    const err = await response.json();
                                    alert(`System Error: ${err.error || 'Check backend'}`);
                                }
                            } catch (error) {
                                console.error("API error:", error);
                                alert("Communications failure.");
                            }
                        }}>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase ml-1 font-bold tracking-widest">Asset Category</label>
                                <select name="type" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                    <option value="pothole">Road Pothole</option>
                                    <option value="garbage">Garbage Pile</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase ml-1 font-bold tracking-widest">Evidence (.JPG)</label>
                                <input
                                    type="file"
                                    name="image"
                                    accept=".jpg,.jpeg"
                                    className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-black file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 transition-all cursor-pointer"
                                />
                            </div>

                            <button type="submit" className="w-full bg-slate-100 hover:bg-white text-slate-900 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]">
                                Sync to Central
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className={`p-4 border-t border-slate-700 ${isCollapsed ? 'px-0 flex justify-center' : ''}`}>
                <button className={`flex items-center gap-3 text-slate-500 hover:text-white transition-colors w-full rounded-lg hover:bg-slate-800 ${isCollapsed ? 'justify-center p-2' : 'p-3'}`}>
                    <Settings size={isCollapsed ? 20 : 18} />
                    {!isCollapsed && <span className="text-[11px] font-bold uppercase tracking-widest">Admin Portal</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
