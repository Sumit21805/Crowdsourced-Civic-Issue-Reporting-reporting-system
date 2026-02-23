import { useState, useEffect } from 'react';
import { X, MapPin, AlertTriangle, ExternalLink, Cpu, Timer, Trash2, Send, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import API_BASE from '../../../config';

const IncidentDetail = ({ incident, onClose, onActionComplete, departments = [] }) => {
    const [selectedDept, setSelectedDept] = useState('');
    const [assigning, setAssigning] = useState(false);

    if (!incident) return null;

    const getImagePath = (inc) => {
        if (inc.image_path) return `${API_BASE}${inc.image_path}`;
        if (inc.type === 'pothole') return '/pothole.jpg';
        if (inc.type === 'garbage') return '/garbage.jpg';
        return '/pothole.jpg';
    };

    const handleAssign = async () => {
        if (!selectedDept) { alert("Select a department first!"); return; }
        setAssigning(true);
        try {
            const response = await fetch(`${API_BASE}/api/incidents/${incident.id}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: selectedDept })
            });
            if (response.ok) {
                const dept = departments.find(d => d.id === selectedDept);
                alert(`✅ Dispatched to ${dept?.icon} ${dept?.name}`);
                onActionComplete();
                onClose();
            }
        } catch (err) { console.error(err); }
        finally { setAssigning(false); }
    };



    const handleDelete = async () => {
        if (!window.confirm("Delete this entry from database?")) return;
        try {
            const response = await fetch(`${API_BASE}/api/incidents/${incident.id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                onActionComplete();
                onClose();
            }
        } catch (err) { console.error(err); }
    };

    const statusColor = {
        Active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        Assigned: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        Resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
        Audit: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    };

    const statusDot = {
        Active: 'bg-blue-500 animate-pulse',
        Assigned: 'bg-amber-500 animate-pulse',
        Resolved: 'bg-green-500',
        Audit: 'bg-orange-500 animate-pulse',
    };

    const assignedDept = departments.find(d => d.id === incident.department);

    return (
        <div
            className="absolute top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 z-[1100] shadow-2xl flex flex-col"
            style={{ animation: 'slide-in-right 0.3s ease-out forwards' }}
        >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="font-bold text-white flex items-center gap-2">
                    <AlertTriangle size={18} className={incident.type === 'pothole' ? 'text-red-400' : incident.type === 'garbage' ? 'text-yellow-400' : 'text-blue-400'} />
                    Incident Intel
                </h2>
                <div className="flex items-center gap-1">
                    <button onClick={handleDelete} className="p-2 hover:bg-red-500/10 rounded-full text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Image */}
                <div className="rounded-2xl overflow-hidden border border-slate-700 relative aspect-video bg-slate-800 shadow-inner">
                    <img src={getImagePath(incident)} alt={incident.type} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] text-white flex items-center gap-1 border border-white/10">
                        <ExternalLink size={10} /> Neural View
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] text-slate-300 font-mono">
                        ID #{incident.id}
                    </div>
                </div>

                {/* Category + Status */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Category</label>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-white capitalize font-bold text-sm">
                            {incident.type}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Status</label>
                        <div className={`p-3 rounded-xl border font-black text-[10px] flex items-center gap-2 ${statusColor[incident.status] || statusColor.Active}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${statusDot[incident.status] || statusDot.Active}`}></div>
                            {incident.status?.toUpperCase()}
                        </div>
                    </div>
                </div>

                {/* AI Confidence + Process Time */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">AI Confidence</label>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-cyan-400 font-mono text-sm flex items-center gap-2">
                            <Cpu size={14} />
                            {(incident.confidence * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Process Time</label>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-slate-300 font-mono text-xs flex items-center gap-2">
                            <Timer size={14} />
                            {incident.processing_time?.toFixed(2)}s
                        </div>
                    </div>
                </div>

                {/* Coordinates */}
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Coordinates</label>
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-slate-400 text-xs flex items-center gap-2">
                        <MapPin size={14} className="text-slate-500" />
                        {incident.lat && incident.lng
                            ? `${incident.lat.toFixed(6)}, ${incident.lng.toFixed(6)}`
                            : <span className="text-orange-400 font-bold italic">LOCATION UNKNOWN</span>}
                    </div>
                </div>

                {/* Reported By */}
                <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Reported By</label>
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white">{incident.user_name?.[0]?.toUpperCase()}</div>
                        {incident.user_name}
                        <span className="text-[8px] text-slate-500 ml-auto">{incident.reported_at}</span>
                    </div>
                </div>

                {/* Department Assignment */}
                {assignedDept && (
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Assigned Department</label>
                        <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-2">
                            <Building2 size={14} />
                            <span>{assignedDept.icon} {assignedDept.name}</span>
                        </div>
                    </div>
                )}

                {/* Resolution Details */}
                {incident.status === 'Resolved' && (
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Resolution Details</label>
                        <div className="bg-green-500/5 p-3 rounded-xl border border-green-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                                <CheckCircle2 size={14} /> Resolved by Department
                            </div>
                            <div className="text-green-300 text-xs">
                                {incident.resolution_note ? `"${incident.resolution_note}"` : <span className="text-slate-500 italic">No resolution note provided</span>}
                            </div>
                            {incident.resolved_at && (
                                <div className="text-[9px] text-slate-500">{incident.resolved_at}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Audit Reason */}
                {incident.status === 'Audit' && incident.audit_reason && (
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-bold">Audit Reason</label>
                        <div className="bg-orange-500/5 p-3 rounded-xl border border-orange-500/20 text-orange-300 text-xs">
                            ⚠️ {incident.audit_reason}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex flex-col gap-2">
                {/* Assign to Department */}
                {(incident.status === 'Active' || incident.status === 'Audit') && (
                    <div className="space-y-2">
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                        >
                            <option value="">Select Department...</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleAssign}
                            disabled={!selectedDept || assigning}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {assigning ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                            Dispatch to Department
                        </button>
                    </div>
                )}

                {/* Assigned — Department handles resolution */}
                {incident.status === 'Assigned' && (
                    <div className="text-center py-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                        <div className="text-amber-400 text-xs font-bold uppercase flex items-center justify-center gap-2">
                            <Building2 size={14} /> Dispatched to Department
                        </div>
                        <div className="text-[9px] text-slate-500 mt-1">Awaiting resolution via Department Portal</div>
                    </div>
                )}

                {/* Already Resolved */}
                {incident.status === 'Resolved' && (
                    <div className="text-center py-3 bg-green-500/5 rounded-xl border border-green-500/20">
                        <div className="text-green-400 text-xs font-bold uppercase flex items-center justify-center gap-2">
                            <CheckCircle2 size={14} /> Issue Resolved
                        </div>
                        {incident.resolved_at && <div className="text-[9px] text-slate-500 mt-1">{incident.resolved_at}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IncidentDetail;
