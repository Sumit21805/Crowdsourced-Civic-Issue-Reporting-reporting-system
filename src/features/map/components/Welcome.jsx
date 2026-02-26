import { useState } from 'react';
import { User, ArrowRight, ShieldCheck } from 'lucide-react';

const Welcome = ({ onJoin }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onJoin(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 shadow-2xl shadow-blue-500/20 mb-6 rotate-3">
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                        Civic<span className="text-blue-500">Guard</span>
                    </h1>
                    <p className="text-slate-400">Join the AI-powered city intelligence network</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">
                                Agent Identity
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                <input
                                    autoFocus
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            Establish Link <ArrowRight size={20} />
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-slate-600 text-xs uppercase tracking-widest font-medium">
                    Secured by Neural Verification 1.0.1
                </p>
            </div>
        </div>
    );
};

export default Welcome;
