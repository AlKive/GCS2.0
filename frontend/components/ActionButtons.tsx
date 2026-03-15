import React from 'react';
import type { LiveTelemetry } from '../types';

interface PreFlightPanelProps {
    onMissionSetup: () => void;
    telemetry: LiveTelemetry;
    setArmedState: (isArmed: boolean) => void;
}

const PreFlightPanel: React.FC<PreFlightPanelProps> = ({ onMissionSetup, telemetry, setArmedState }) => {
    return (
        <div className="bg-gcs-panel border border-main p-6 rounded-lg shadow-2xl h-full flex flex-col relative overflow-hidden">
            {/* Header / Title */}
            <div className="mb-8 relative">
                <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gcs-primary shadow-[0_0_10px_var(--neon-glow)]" />
                <h3 className="text-sm font-black text-main uppercase tracking-[0.3em] font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gcs-primary animate-ping" />
                    SYSTEM_READY_
                </h3>
                <p className="text-[9px] text-dim font-mono mt-1 tracking-widest uppercase">Awaiting_Command_Link</p>
            </div>
            
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gcs-card border border-main p-3 rounded">
                    <p className="text-[8px] font-mono text-dim uppercase tracking-widest mb-1">GPS_SAT_LOCK</p>
                    <div className="flex items-end justify-between">
                        <span className={`text-sm font-bold font-mono ${telemetry.satellites > 6 ? 'text-gcs-success' : 'text-gcs-error'}`}>
                            {telemetry.satellites.toString().padStart(2, '0')}
                        </span>
                        <div className="flex gap-0.5 pb-1">
                            {[1,2,3,4].map(i => (
                                <div key={i} className={`w-1 h-2 rounded-sm ${telemetry.satellites > (i*3) ? 'bg-gcs-success shadow-[0_0_5px_#10b981]' : 'bg-slate-800 opacity-20'}`} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-gcs-card border border-main p-3 rounded">
                    <p className="text-[8px] font-mono text-dim uppercase tracking-widest mb-1">SIGNAL_DBM</p>
                    <div className="flex items-end justify-between">
                        <span className="text-sm font-bold font-mono text-main">
                            {telemetry.signalStrength}
                        </span>
                        <span className="text-[8px] font-mono text-dim uppercase pb-0.5">DBM</span>
                    </div>
                </div>
            </div>

            {/* Ghost Arming Controls */}
            <div className="space-y-3 mb-auto">
                <p className="text-[9px] font-mono text-dim uppercase tracking-widest ml-1">MASTER_SAFETY_SWITCH</p>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setArmedState(true)} 
                        disabled={telemetry.armed} 
                        className={`h-12 font-black font-mono text-[10px] tracking-widest rounded transition-all duration-500 border ${
                            telemetry.armed 
                            ? 'bg-gcs-success/20 border-gcs-success text-gcs-success' 
                            : 'bg-transparent border-main text-dim hover:border-gcs-success hover:text-gcs-success'
                        }`}
                    >
                        ARM_SYS
                    </button>
                    <button 
                        onClick={() => setArmedState(false)} 
                        disabled={!telemetry.armed} 
                        className={`h-12 font-black font-mono text-[10px] tracking-widest rounded transition-all duration-500 border ${
                            !telemetry.armed 
                            ? 'bg-gcs-error/20 border-gcs-error text-gcs-error' 
                            : 'bg-transparent border-main text-dim hover:border-gcs-error hover:text-gcs-error'
                        }`}
                    >
                        SAFE_DIS
                    </button>
                </div>
            </div>

            {/* Launch CTA */}
            <div className="mt-8">
                <button 
                    onClick={onMissionSetup}
                    className="w-full py-4 bg-gcs-primary text-slate-100 font-black font-mono text-xs tracking-[0.2em] rounded shadow-[0_0_20px_var(--neon-glow)] transition-all active:scale-[0.98] relative overflow-hidden group"
                >
                    <div className="relative z-10 flex items-center justify-center gap-3 uppercase">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Initialize_Link
                    </div>
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                </button>
            </div>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .group-hover\\:animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
            `}</style>
        </div>
    );
};

export default PreFlightPanel;
