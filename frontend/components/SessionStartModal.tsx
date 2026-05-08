import React, { useState, useEffect } from 'react';
import { User, Barangay } from 'types';

interface SessionStartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (config: SessionConfig) => void;
}

export interface SessionConfig {
    session_name: string;
    pilot_id: string;
    pilot_name?: string; // For "others"
    barangay_id: number;
}

const SessionStartModal: React.FC<SessionStartModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [config, setConfig] = useState<SessionConfig>({
        session_name: `Mission_${new Date().toLocaleDateString().replace(/\//g, '-')}_${new Date().getHours()}${new Date().getMinutes()}`,
        pilot_id: '',
        barangay_id: 0
    });
    
    const [pilots, setPilots] = useState<User[]>([]);
    const [barangays, setBarangays] = useState<Barangay[]>([]);
    const [isOthersSelected, setIsOthersSelected] = useState(false);
    const [otherPilotName, setOtherPilotName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usersRes, locsRes] = await Promise.all([
                fetch('http://localhost:8080/api/users'),
                fetch('http://localhost:8080/api/locations')
            ]);
            const users = await usersRes.json();
            const locs = await locsRes.json();

            // Allow all users to appear in the dropdown, or add specific roles
            setPilots(users); 
            setBarangays(locs);
            
            // Set defaults if available
            if (users.length > 0) setConfig(c => ({ ...c, pilot_id: users[0].id }));
            if (locs.length > 0) setConfig(c => ({ ...c, barangay_id: locs[0].id }));
        } catch (error) {
            console.error("Failed to fetch reference data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isOthersSelected && !otherPilotName.trim()) {
            alert("Please enter pilot name");
            return;
        }
        onConfirm({
            ...config,
            pilot_name: isOthersSelected ? otherPilotName : undefined,
            pilot_id: isOthersSelected ? '' : config.pilot_id
        });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gcs-panel border border-gcs-primary w-full max-w-md rounded-lg shadow-2xl relative overflow-hidden">
                {/* Tactical Header */}
                <div className="bg-gcs-primary/10 border-b border-gcs-primary/30 p-4">
                    <h3 className="text-sm font-black text-gcs-primary uppercase tracking-[0.3em] font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gcs-primary animate-pulse" />
                        FLIGHT_SESSION_CONFIG_
                    </h3>
                    <p className="text-[9px] text-slate-400 font-mono mt-1 tracking-widest uppercase italic">Awaiting pre-flight parameters...</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Session Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">SESSION_IDENTIFIER</label>
                        <input 
                            type="text" 
                            required
                            value={config.session_name}
                            onChange={e => setConfig({ ...config, session_name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm font-mono text-white focus:border-gcs-primary focus:outline-none transition-colors shadow-inner"
                            placeholder="ENTER MISSION NAME"
                        />
                    </div>

                    {/* Pilot Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ASSIGNED_PILOT</label>
                        <select 
                            value={isOthersSelected ? 'others' : config.pilot_id}
                            onChange={e => {
                                if (e.target.value === 'others') {
                                    setIsOthersSelected(true);
                                } else {
                                    setIsOthersSelected(false);
                                    setConfig({ ...config, pilot_id: e.target.value });
                                }
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm font-mono text-white focus:border-gcs-primary focus:outline-none transition-colors shadow-inner appearance-none cursor-pointer"
                        >
                            {pilots.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                            <option value="others">OTHERS (MANUAL ENTRY)</option>
                        </select>
                        
                        {isOthersSelected && (
                            <input 
                                type="text" 
                                required
                                value={otherPilotName}
                                onChange={e => setOtherPilotName(e.target.value)}
                                className="w-full bg-slate-900 border border-gcs-primary/50 rounded mt-2 p-3 text-sm font-mono text-white focus:border-gcs-primary focus:outline-none transition-colors animate-slide-down"
                                placeholder="TYPE PILOT FULL NAME"
                            />
                        )}
                    </div>

                    {/* Barangay Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">OPERATIONAL_BARANGAY</label>
                        <select 
                            value={config.barangay_id}
                            onChange={e => setConfig({ ...config, barangay_id: parseInt(e.target.value) })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm font-mono text-white focus:border-gcs-primary focus:outline-none transition-colors shadow-inner appearance-none cursor-pointer"
                        >
                            {barangays.map(b => (
                                <option key={b.id} value={b.id}>Barangay {b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-700 text-slate-400 font-mono text-xs tracking-widest rounded hover:bg-slate-800 transition-colors uppercase"
                        >
                            ABORT
                        </button>
                        <button 
                            type="submit"
                            className="flex-2 py-3 bg-gcs-primary text-white font-black font-mono text-xs tracking-[0.2em] rounded shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] transition-all uppercase px-8"
                        >
                            INITIALIZE_FLIGHT
                        </button>
                    </div>
                </form>

                {/* Loading State Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-gcs-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] font-mono text-gcs-primary tracking-widest animate-pulse uppercase">SYNCING_DATABASE...</span>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .animate-slide-down {
                    animation: slideDown 0.3s ease-out forwards;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SessionStartModal;