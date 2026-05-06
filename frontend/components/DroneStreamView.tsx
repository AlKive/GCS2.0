import React, { useState, useEffect } from 'react';
import type { LiveTelemetry } from 'types';

// --- Reusable Panel Component ---
const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-gcs-panel border border-slate-700/50 rounded flex flex-col overflow-hidden shadow-2xl ${className}`}>
        <div className="bg-slate-900/80 px-2 py-1 border-b border-slate-800 text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] font-mono">
            {title}_
        </div>
        <div className="p-2 flex-1 flex flex-col">
            {children}
        </div>
    </div>
);

const StatusIndicator: React.FC<{ label: string; active: boolean; color?: string }> = ({ label, active, color = 'bg-gcs-success' }) => (
    <div className="flex items-center justify-between py-0.5 border-b border-slate-800 last:border-0">
        <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">{label}</span>
        <div className="flex items-center gap-1.5">
            <span className={`w-1 h-1 rounded-full ${active ? color : 'bg-slate-800'} ${active ? 'animate-pulse' : ''} ${active && color.includes('success') ? 'neon-glow-green' : active ? 'neon-glow-red' : ''}`} />
            <span className={`text-[8px] font-mono font-black ${active ? 'text-slate-200' : 'text-slate-600'}`}>{active ? 'OK' : 'FAIL'}</span>
        </div>
    </div>
);

const ModeIndicator: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
    <div className={`px-1.5 py-0.5 rounded text-[7px] font-black font-mono tracking-widest border transition-all duration-300 ${active ? 'bg-gcs-primary/10 text-gcs-primary border-gcs-primary/30 neon-glow-red' : 'bg-slate-900/30 text-slate-600 border-slate-800'}`}>
        {label}
    </div>
);

const GaugeWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`relative w-32 h-32 bg-slate-900 rounded-full border-2 border-slate-800 flex items-center justify-center shadow-[inset_0_0_25px_rgba(0,0,0,0.9)] ${className}`}>
        {children}
    </div>
);

const GaugeContainer: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col items-center gap-1">
        {children}
        <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
);

const AttitudeIndicatorGauge: React.FC<{ roll: number; pitch: number }> = ({ roll, pitch }) => {
    return (
        <GaugeWrapper className="overflow-hidden border-slate-700/50">
            <div className="w-full h-full rounded-full overflow-hidden transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-roll}deg)` }}>
                <div className="absolute w-full h-[300%] bg-blue-900/20 top-[-100%]" style={{ transform: `translateY(${-pitch * 2.5}px)` }}>
                    <div className="h-1/2 bg-amber-900/20 absolute bottom-0 w-full border-t-2 border-slate-100/50" />
                    {[20, 10, 0, -10, -20].map(p => (
                        <div key={p} className="absolute w-full flex justify-center" style={{ top: `calc(50% - ${p * 2.5}px)` }}>
                            <div className={`h-px bg-slate-100/30 ${p === 0 ? 'w-full' : 'w-8'}`} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full p-6">
                    <path d="M15 50 H 35 M65 50 H 85 M50 42 V 58" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" className="neon-glow-red" />
                </svg>
            </div>
        </GaugeWrapper>
    );
};

const AltitudeGauge: React.FC<{ altitude: number }> = ({ altitude }) => {
    return (
        <GaugeWrapper className="border-slate-700/50">
            <div className="absolute inset-0 opacity-20">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 18}deg)` }}>
                        <div className="absolute top-1 left-1/2 -ml-px w-0.5 h-3 bg-slate-100" />
                    </div>
                ))}
            </div>
            <div className="relative z-10 text-center">
                <p className="text-[7px] text-slate-500 font-black font-mono tracking-widest">ALT_M</p>
                <p className="text-2xl font-mono font-black text-slate-100 leading-none">{(altitude || 0).toFixed(1)}</p>
            </div>
            <div className="absolute w-1 h-1/2 bg-transparent top-0 left-1/2 -ml-0.5 origin-bottom transition-transform duration-300" style={{ transform: `rotate(${(altitude % 10) * 36}deg)` }}>
                <div className="w-full h-10 bg-gcs-primary shadow-[0_0_8px_#ef4444]" />
            </div>
        </GaugeWrapper>
    );
};

const HeadingIndicator: React.FC<{ heading: number }> = ({ heading }) => {
    return (
        <GaugeWrapper className="border-slate-700/50">
            <div className="absolute inset-0 transition-transform duration-200" style={{ transform: `rotate(${-heading}deg)` }}>
                {['N', 'E', 'S', 'W'].map((d, i) => (
                    <div key={d} className="absolute w-full h-full" style={{ transform: `rotate(${i * 90}deg)` }}>
                        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-300 font-mono">{d}</span>
                    </div>
                ))}
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 30}deg)` }}>
                        <div className="absolute top-1 left-1/2 -ml-px w-px h-2 bg-slate-700" />
                    </div>
                ))}
            </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <svg viewBox="0 0 50 50" fill="#ef4444" className="w-6 h-6 neon-glow-red">
                     <path d="M25 5 L28 45 L25 40 L22 45 Z" />
                 </svg>
             </div>
             <div className="absolute top-8 text-gcs-primary font-mono text-xs font-black">
                 {Math.round(heading || 0).toString().padStart(3, '0')}°
             </div>
        </GaugeWrapper>
    );
};

const VerticalSpeedIndicator: React.FC<{ vspeed: number }> = ({ vspeed }) => {
    return (
        <GaugeWrapper className="border-slate-700/50">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="w-full h-px bg-slate-100" />
                <div className="h-full w-px bg-slate-100" />
            </div>
            <div className="relative z-10 text-center">
                <p className="text-[7px] text-slate-500 font-black font-mono tracking-widest">V_SPD</p>
                <p className={`text-lg font-mono font-black ${(vspeed || 0) >= 0 ? 'text-gcs-success' : 'text-gcs-error'}`}>{(vspeed || 0).toFixed(1)}</p>
                <p className="text-[6px] text-slate-600 font-mono">M/S</p>
            </div>
        </GaugeWrapper>
    );
};

interface DroneStreamViewProps {
    telemetry: LiveTelemetry;
    onClose: () => void;
    mapStyle: string;
}

const DroneStreamView: React.FC<DroneStreamViewProps> = ({ telemetry, onClose, mapStyle }) => {
    const [reloadKey, setReloadKey] = useState(0);
    const [isReinitializing, setReinitializing] = useState(false);
    const [streamError, setStreamError] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/logs`;
        const ws = new WebSocket(wsUrl);

        // GCS Requirement: End flight session when user exits panel
        return () => {
            ws.close();
        };
    }, []);

    const handleTerminate = () => {
        const hostname = window.location.hostname;
        fetch(`http://${hostname}:5000/api/end_flight`, { method: 'POST' })
            .catch(err => console.error("Failed to finalize mission log:", err))
            .finally(() => onClose());
    };

    const handleRestart = () => {
        setReinitializing(true);
        fetch('/api/system/start', { method: 'POST' })
            .finally(() => {
                setTimeout(() => {
                    setReinitializing(false);
                    setReloadKey(prev => prev + 1);
                    setStreamError(false);
                }, 2000);
            });
    };

    return (
        <div className="h-full bg-gcs-dark text-slate-300 font-sans flex flex-col overflow-hidden animate-fade-in relative">
            {/* Confirmation Modal */}
            {showExitConfirm && (
                <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full shadow-2xl animate-fade-in">
                        <h2 className="text-lg font-black text-slate-100 uppercase tracking-widest mb-2 font-mono italic">Confirm Termination</h2>
                        <p className="text-xs text-slate-400 mb-6 font-mono uppercase tracking-wider leading-relaxed">
                            Ending the stream will finalize the current mission log and disconnect the tactical link. Continue?
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleTerminate}
                                className="flex-1 py-2 bg-gcs-primary hover:bg-red-600 text-slate-100 rounded font-mono text-[10px] font-black uppercase tracking-widest transition-all shadow-lg neon-glow-red"
                            >
                                Terminate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Lost Overlay */}
            {telemetry.aiStatus?.linkStatus === 'Lost' && (
                <div className="absolute top-12 left-0 right-0 z-[150] bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-3 animate-pulse shadow-2xl border-y border-red-400 font-mono text-[10px] font-black tracking-widest uppercase italic">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    CONNECTION LOST: Drone has switched to offline recording on SD Card.
                </div>
            )}

            {/* Tactical Top Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-1 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowExitConfirm(true)}
                        className="p-1.5 hover:bg-slate-800 border border-slate-800 rounded transition-all text-slate-500 hover:text-gcs-primary group"
                    >
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xs font-black tracking-[0.3em] font-mono text-slate-100 uppercase italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gcs-primary animate-pulse" />
                            DRONE_LIVE_STREAM_
                        </h1>
                        <p className="text-[7px] text-slate-600 font-mono uppercase tracking-[0.2em]">GEP-F405-HD | TAC_LINK_ESTABLISHED</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRestart}
                        disabled={isReinitializing}
                        className="bg-slate-850 border border-slate-700 hover:border-gcs-primary text-slate-400 hover:text-gcs-primary px-3 py-1 rounded font-mono text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                        {isReinitializing ? 'REINITIALIZING...' : 'RESTART_STREAM'}
                    </button>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="text-right">
                        <span className="text-[7px] font-mono font-bold uppercase text-slate-600 tracking-widest">STATUS</span>
                        <p className={`text-[9px] font-black font-mono ${telemetry.armed ? 'text-gcs-primary animate-pulse' : 'text-gcs-success'}`}>
                            {telemetry.armed ? 'LOCKED_ARMED' : 'SYS_STANDBY'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tactical HUD Grid - 5 Columns to balance space */}
            <div className="flex-1 grid grid-cols-5 gap-2 p-2 min-h-0 bg-hud-grid">

                {/* Left Panel: Navigation & Core Sensors (1/5) */}
                <div className="col-span-1 flex flex-col gap-2 min-h-0">
                    <Panel title="SYSTEM STATUS" className="flex-none">
                        <div className="flex flex-col gap-1.5">
                            <div className={`py-1 rounded text-center font-black font-mono text-[8px] tracking-[0.3em] border transition-all ${telemetry.armed ? 'bg-gcs-primary/10 text-gcs-primary border-gcs-primary/50 neon-glow-red' : 'bg-slate-900/50 text-slate-600 border-slate-800'}`}>
                                {telemetry.armed ? 'ARMED' : 'UNARMED'}
                            </div>

                            <div className="space-y-0.5">
                                <StatusIndicator label="GYRO" active={true} />
                                <StatusIndicator label="ACC" active={true} />
                                <StatusIndicator label="BARO" active={true} />
                                <StatusIndicator label="GPS" active={(telemetry.satellites || 0) > 6} />
                                <StatusIndicator label="LINK" active={(telemetry.signalStrength || 0) > -90} />
                            </div>

                            <div className="border-t border-slate-800 pt-1.5">
                                <span className="text-[7px] text-slate-600 font-mono font-black uppercase tracking-widest block mb-1">MODES</span>
                                <div className="grid grid-cols-3 gap-0.5">
                                    <ModeIndicator label="ANG" active={telemetry.modes?.angle} />
                                    <ModeIndicator label="POS" active={telemetry.modes?.positionHold} />
                                    <ModeIndicator label="ALT" active={telemetry.modes?.altitudeHold} />
                                    <ModeIndicator label="RTH" active={telemetry.modes?.returnToHome} />
                                    <ModeIndicator label="AIR" active={telemetry.modes?.airmode} />
                                    <ModeIndicator label="BRK" active={telemetry.modes?.mcBraking} />
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="ANALOG_GAUGES" className="flex-1 min-h-0">
                        <div className="grid grid-cols-2 gap-x-1 gap-y-6 justify-items-center items-center h-full py-4">
                             <GaugeContainer label="ALTITUDE">
                                 <AltitudeGauge altitude={telemetry.altitude} />
                             </GaugeContainer>
                             <GaugeContainer label="ATTITUDE">
                                 <AttitudeIndicatorGauge roll={telemetry.roll} pitch={telemetry.pitch} />
                             </GaugeContainer>
                             <GaugeContainer label="HEADING">
                                 <HeadingIndicator heading={telemetry.heading} />
                             </GaugeContainer>
                             <GaugeContainer label="VERT_SPD">
                                 <VerticalSpeedIndicator vspeed={telemetry.verticalSpeed} />
                             </GaugeContainer>
                        </div>
                    </Panel>
                </div>

                {/* Center HUD: Primary Optical Stream (3/5) */}
                <div className="col-span-3 flex flex-col gap-2 min-h-0">
                    <div className="flex-1 bg-black border border-slate-700/50 relative overflow-hidden group rounded shadow-2xl flex items-center justify-center">
                        {streamError ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border border-slate-800 rounded-full flex items-center justify-center animate-pulse">
                                    <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                </div>
                                <p className="text-[8px] font-mono text-slate-600 tracking-[0.2em] uppercase">Tactical_Link_Lost</p>
                            </div>
                        ) : (
                            <img
                                src={`/camera_feed?t=${reloadKey}`}
                                className="max-w-full max-h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                                alt="Live Tactical Stream"
                                onError={() => setStreamError(true)}
                            />
                        )}

                        {/* Centered Crosshair */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                            <div className="w-12 h-px bg-gcs-primary" />
                            <div className="h-12 w-px bg-gcs-primary" />
                            <div className="absolute w-20 h-20 border border-gcs-primary rounded-full" />
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                            <div className="bg-slate-900/80 border border-slate-700 backdrop-blur-md px-3 py-2 rounded shadow-2xl">
                                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                                    {[
                                        { l: 'LAT', v: (telemetry.gps?.lat || 0).toFixed(6) },
                                        { l: 'LON', v: (telemetry.gps?.lon || 0).toFixed(6) },
                                        { l: 'ALT', v: `${(telemetry.altitude || 0).toFixed(1)}M` }
                                    ].map(stat => (
                                        <div key={stat.l}>
                                            <span className="text-[6px] text-slate-500 font-mono font-black block uppercase">{stat.l}</span>
                                            <span className="text-[9px] font-mono font-bold text-slate-100 block">{stat.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right bg-slate-900/80 border border-slate-700 backdrop-blur-md px-2 py-1 rounded">
                                <span className="text-[6px] font-mono text-slate-500 block uppercase">FLIGHT_TIME</span>
                                <span className="text-xs font-mono font-black text-gcs-primary neon-glow-red tabular-nums">{telemetry.flightTime}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Power & AI Acquisition (1/5) */}
                <div className="col-span-1 flex flex-col gap-2 min-h-0">
                    <Panel title="BATTERY STATUS">
                        <div className="flex flex-col gap-1.5">
                            <div className="bg-slate-900 border border-slate-800 p-2 rounded flex items-center justify-between">
                                <div>
                                    <span className="text-[7px] text-slate-500 uppercase font-black font-mono">VOLTAGE</span>
                                    <span className="text-base font-mono font-black text-gcs-success block">{(telemetry.battery?.voltage || 0).toFixed(2)}V</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-slate-100 font-mono">{(telemetry.battery?.percentage || 0).toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="bg-gcs-primary neon-glow-red h-full transition-all duration-1000" style={{ width: `${telemetry.battery?.percentage || 0}%` }} />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="AI ACQUISITION">
                        <div className="flex flex-col gap-2">
                            <div className={`py-2 rounded flex flex-col items-center justify-center border transition-all duration-500 ${telemetry.aiStatus?.waterConfirmed ? 'bg-gcs-success/10 border-gcs-success/50 neon-glow-green' : 'bg-slate-900/50 border-slate-800'}`}>
                                <span className="text-[7px] text-slate-500 uppercase font-black font-mono mb-0.5 tracking-widest">TARGET_LOCK</span>
                                <span className={`text-[10px] font-black font-mono tracking-widest ${telemetry.aiStatus?.waterConfirmed ? 'text-gcs-success animate-pulse' : 'text-slate-100'}`}>
                                    {telemetry.aiStatus?.waterConfirmed ? 'LOCKED' : (telemetry.aiStatus?.trackingProgress || 0) > 0 ? 'ANALYZING' : 'SCANNING'}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-1">
                                <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center">
                                    <span className="text-[6px] text-slate-500 uppercase font-black font-mono block">PIPELINE_LATENCY</span>
                                    <span className="font-mono font-black text-[10px] text-slate-100">{(telemetry.aiStatus?.totalPipelineSpeedMs || 0).toFixed(0)}MS</span>
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="PAYLOAD SYSTEM">
                        <div className="flex flex-col gap-2">
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[7px] text-slate-500 uppercase font-black font-mono">TANK</span>
                                    <span className="font-mono text-slate-100 text-[8px] font-bold">975ML</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2.5 rounded-sm relative overflow-hidden border border-slate-700">
                                    <div className="bg-gradient-to-r from-slate-700 to-gcs-primary h-full transition-all duration-500" style={{ width: '65%' }} />
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[7px] text-slate-500 uppercase font-black font-mono">LIDAR_ALT</span>
                                    <span className={`font-mono text-[8px] font-bold ${(telemetry.aiStatus?.lidar_m ?? 0) <= 1.5 ? 'text-gcs-success' : 'text-gcs-error'}`}>
                                        {(telemetry.aiStatus?.lidar_m ?? 0).toFixed(2)}M
                                    </span>
                                </div>
                                <button 
                                    onClick={() => fetch(`http://${window.location.hostname}:5000/api/manual_spray`, { method: 'POST' })}
                                    disabled={!telemetry.aiStatus?.waterConfirmed || (telemetry.aiStatus?.lidar_m ?? 0) > 1.5}
                                    className={`w-full py-2.5 rounded font-black font-mono text-[9px] tracking-widest transition-all border shadow-lg ${
                                        (telemetry.aiStatus?.waterConfirmed && (telemetry.aiStatus?.lidar_m ?? 0) <= 1.5)
                                        ? 'bg-gcs-primary border-gcs-primary text-slate-100 neon-glow-red active:scale-95 animate-pulse' 
                                        : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                    }`}
                                >
                                    {(telemetry.aiStatus?.waterConfirmed && (telemetry.aiStatus?.lidar_m ?? 0) <= 1.5) ? 'CONFIRMED: DISPENSE GRANULES' : 'WAITING FOR TARGET LOCK'}
                                </button>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default DroneStreamView;