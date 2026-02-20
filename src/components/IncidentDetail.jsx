import { X, MapPin, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

const IncidentDetail = ({ incident, onClose }) => {
    if (!incident) return null;

    // Map incident type to local images in /public
    const getImagePath = (inc) => {
        if (inc.imagePath) {
            return `http://192.168.1.7:5000${inc.imagePath}`;
        }
        if (inc.type === 'pothole') return '/pothole.jpg';
        if (inc.type === 'garbage') return '/garbage.jpg';
        if (inc.type === 'light') return '/light.jpg';
        return '/pothole.jpg'; // Default fallback
    };

    return (
        <div className="absolute top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 z-[1100] transform transition-transform duration-300 shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="font-bold text-white flex items-center gap-2">
                    <AlertTriangle size={18} className={incident.type === 'pothole' ? 'text-red-400' : incident.type === 'garbage' ? 'text-yellow-400' : 'text-blue-400'} />
                    Incident Details
                </h2>
                <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="rounded-xl overflow-hidden border border-slate-700 relative aspect-video bg-slate-800">
                    <img
                        src={getImagePath(incident)}
                        alt={incident.type}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white flex items-center gap-1">
                        <ExternalLink size={10} /> Live Detection
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Type</label>
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-white capitalize font-semibold">
                            {incident.type}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Severity</label>
                            <div className={`p-3 rounded-lg border border-slate-700 font-semibold ${incident.severity === 'High' ? 'text-red-400' : incident.severity === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                                {incident.severity}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Status</label>
                            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-cyan-400 font-mono text-sm">
                                ACTIVE
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Location</label>
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                            <MapPin size={14} className="text-slate-500" />
                            {incident.lat.toFixed(6)}, {incident.lng.toFixed(6)}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">Detected At</label>
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-slate-400 text-xs flex items-center gap-2">
                            <Clock size={14} className="text-slate-500" />
                            {incident.reportedAt ? new Date(incident.reportedAt).toLocaleString() : new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold shadow-lg transition-all active:scale-95">
                    Assign Repair Unit
                </button>
            </div>
        </div>
    );
};

export default IncidentDetail;
