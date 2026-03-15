import React, { useState, useEffect } from 'react';
import type { LiveTelemetry, BreedingSiteInfo } from 'types';

// --- Reusable Panel Component ---
const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-gcs-panel border border-slate-700/50 rounded flex flex-col overflow-hidden shadow-2xl ${className}`}>
        <div className="bg-slate-900/80 px-3 py-1.5 border-b border-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] font-mono">
            {title}_
        </div>
        <div className="p-4 flex-1 flex flex-col">
            {children}
        </div>
    </div>
);

const StatusIndicator: React.FC<{ label: string; active: boolean; color?: string }> = ({ label, active, color = 'bg-gcs-success' }) => (
    <div className="flex items-center justify-between py-1 border-b border-slate-800 last:border-0">
        <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${active ? color : 'bg-slate-800'} ${active ? 'animate-pulse' : ''} ${active && color.includes('success') ? 'neon-glow-green' : active ? 'neon-glow-red' : ''}`} />
            <span className={`text-[9px] font-mono font-black ${active ? 'text-slate-200' : 'text-slate-600'}`}>{active ? 'OK' : 'FAIL'}</span>
        </div>
    </div>
);

const GaugeWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`relative w-28 h-28 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] ${className}`}>
        {children}
    </div>
);

const AttitudeIndicatorGauge: React.FC<{ roll: number; pitch: number }> = ({ roll, pitch }) => {
    return (
        <GaugeWrapper className="overflow-hidden scale-90 border-slate-700/50">
            <div className="w-full h-full rounded-full overflow-hidden transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-roll}deg)` }}>
                <div className="absolute w-full h-[300%] bg-slate-800 top-[-100%]" style={{ transform: `translateY(${-pitch * 2.5}px)` }}>
                    <div className="h-1/2 bg-slate-900 absolute bottom-0 w-full border-t border-gcs-primary/30" />
                    {[10, 20, 30, -10, -20, -30].map(p => (
                         <div key={p} className="absolute w-full flex justify-center" style={{ top: `calc(50% - ${p * 2.5}px)` }}>
                             <div className={`h-px bg-slate-100/20 ${Math.abs(p) === 20 ? 'w-8' : 'w-4'}`} />
                         </div>
                    ))}
                </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M20 50 H 40 M60 50 H 80 M50 45 V 55" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" className="neon-glow-red" />
                </svg>
            </div>
        </GaugeWrapper>
    );
};

const AltitudeGauge: React.FC<{ altitude: number }> = ({ altitude }) => {
    return (
        <GaugeWrapper className="scale-90 border-slate-700/50">
            <div className="absolute w-full h-full opacity-20">
                {[...Array(50)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 7.2}deg)` }}>
                        <div className={`absolute top-1 left-1/2 -ml-px ${i % 5 === 0 ? 'w-0.5 h-2 bg-slate-100' : 'w-px h-1 bg-slate-500'}`} />
                    </div>
                ))}
            </div>
            <div className="relative z-10 text-center">
                <p className="text-[7px] text-slate-500 font-black font-mono tracking-widest">ALT_M</p>
                <p className="text-xl font-mono font-black text-slate-100 leading-none">{altitude.toFixed(1)}</p>
            </div>
            <div className="absolute w-0.5 h-1/2 bg-transparent top-0 left-1/2 -ml-px origin-bottom transition-transform duration-300" style={{ transform: `rotate(${(altitude % 100) * 3.6}deg)` }}>
                <div className="w-full h-8 bg-gcs-primary shadow-[0_0_8px_#ef4444]" />
            </div>
        </GaugeWrapper>
    );
};

const HeadingIndicator: React.FC<{ heading: number }> = ({ heading }) => {
    return (
        <GaugeWrapper className="scale-90 border-slate-700/50">
            <div className="absolute w-full h-full rounded-full transition-transform duration-200" style={{ transform: `rotate(${-heading}deg)` }}>
                {[...Array(36)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 10}deg)` }}>
                        <div className={`absolute top-1 left-1/2 -ml-px ${i % 9 === 0 ? 'w-0.5 h-3 bg-gcs-primary' : 'w-px h-1 bg-slate-700'}`} />
                    </div>
                ))}
            </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <svg viewBox="0 0 50 50" fill="#ef4444" className="w-6 h-6 neon-glow-red">
                     <path d="M25 5 L30 45 L25 40 L20 45 Z" />
                 </svg>
             </div>
             <div className="absolute top-2 text-gcs-primary font-mono text-[9px] font-black">
                 {Math.round(heading).toString().padStart(3, '0')}°
             </div>
        </GaugeWrapper>
    );
};

const VerticalSpeedIndicator: React.FC<{ vspeed: number }> = ({ vspeed }) => {
    return (
        <GaugeWrapper className="scale-90 border-slate-700/50">
            <div className="absolute w-full h-full opacity-10">
                {[...Array(21)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${(i-10) * 17}deg)` }}>
                        <div className="absolute top-1 left-1/2 -ml-px w-0.5 h-2 bg-slate-100" />
                    </div>
                ))}
            </div>
            <div className="relative z-10 text-center">
                <p className="text-[7px] text-slate-500 font-black font-mono tracking-widest">V_SPD</p>
                <p className={`text-sm font-mono font-black ${vspeed >= 0 ? 'text-gcs-success' : 'text-gcs-error'}`}>{vspeed.toFixed(1)}</p>
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

    return (
        <div className="fixed inset-0 bg-gcs-dark text-slate-300 font-sans z-[100] flex flex-col overflow-hidden animate-fade-in">
            {/* Tactical Top Bar */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 border border-slate-800 rounded transition-all text-slate-500 hover:text-gcs-primary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    </button>
                    <div>
                        <h1 className="text-sm font-black tracking-[0.3em] font-mono text-slate-100 uppercase italic flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gcs-primary animate-pulse" />
                            DRONE_LIVE_STREAM_
                        </h1>
                        <p className="text-[8px] text-slate-600 font-mono uppercase tracking-[0.2em]">GEP-F405-HD | TAC_LINK_ESTABLISHED</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => {
                            setReinitializing(true);
                            fetch('/api/system/start', { method: 'POST' }).finally(() => setTimeout(() => setReinitializing(false), 2000));
                        }}
                        disabled={isReinitializing}
                        className="bg-slate-850 border border-slate-700 hover:border-gcs-primary text-slate-400 hover:text-gcs-primary px-4 py-1.5 rounded font-mono text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                        {isReinitializing ? 'SYSTEM_REINITIALIZING...' : 'RESTART_LIVE_STREAM'}
                    </button>
                    <div className="h-8 w-px bg-slate-800" />
                    <div className="text-right">
                        <span className="text-[7px] font-mono font-bold uppercase text-slate-600 tracking-widest">STATUS</span>
                        <p className={`text-[10px] font-black font-mono ${telemetry.armed ? 'text-gcs-primary animate-pulse' : 'text-gcs-success'}`}>
                            {telemetry.armed ? 'LOCKED_ARMED' : 'SYS_STANDBY'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tactical 3-Column HUD */}
            <div className="flex-1 grid grid-cols-4 gap-4 p-4 min-h-0 bg-hud-grid">
                
                {/* Left Panel: Navigation & Core Sensors */}
                <div className="col-span-1 flex flex-col gap-4 min-h-0">
                    <Panel title="SYSTEM STATUS">
                        <div className="flex flex-col gap-4">
                            <div className={`py-2 rounded text-center font-black font-mono text-[10px] tracking-[0.3em] border transition-all ${telemetry.armed ? 'bg-gcs-primary/10 text-gcs-primary border-gcs-primary/50 neon-glow-red' : 'bg-slate-900/50 text-slate-600 border-slate-800'}`}>
                                {telemetry.armed ? 'ARMED' : 'UNARMED'}
                            </div>
                            
                            <div className="space-y-1">
                                <StatusIndicator label="GYRO_STABILIZER" active={true} />
                                <StatusIndicator label="ACC_SENSOR_BUS" active={true} />
                                <StatusIndicator label="BARO_DATA_LINK" active={true} />
                                <StatusIndicator label="GPS_SAT_LOCK" active={telemetry.satellites > 0} />
                                <StatusIndicator label="RF_LINK_SIGNAL" active={telemetry.signalStrength > -90} />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="ANALOG_GAUGES" className="flex-1 min-h-0">
                        <div className="grid grid-cols-2 gap-4 justify-items-center h-full items-center">
                             <AltitudeGauge altitude={telemetry.altitude} />
                             <AttitudeIndicatorGauge roll={telemetry.roll} pitch={telemetry.pitch} />
                             <HeadingIndicator heading={telemetry.heading} />
                             <VerticalSpeedIndicator vspeed={telemetry.verticalSpeed} />
                        </div>
                    </Panel>
                </div>

                {/* Center HUD: Primary Optical Stream */}
                <div className="col-span-2 flex flex-col gap-4 min-h-0">
                    <div className="flex-1 bg-black border border-slate-700/50 relative overflow-hidden group rounded shadow-2xl">
                        <iframe
                            key={reloadKey}
                            src={`/camera_feed`}
                            className="absolute inset-0 w-full h-full border-0 opacity-90 group-hover:opacity-100 transition-opacity"
                            title="Live Tactical Stream"
                            style={{ background: '#000' }}
                        />
                        
                        {/* HUD Overlay Lines */}
                        <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gcs-primary/40 rounded-tl-sm" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gcs-primary/40 rounded-tr-sm" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gcs-primary/40 rounded-bl-sm" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gcs-primary/40 rounded-br-sm" />
                        </div>

                        {/* Centered Crosshair */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                            <div className="w-16 h-px bg-gcs-primary shadow-[0_0_5px_#ef4444]" />
                            <div className="h-16 w-px bg-gcs-primary shadow-[0_0_5px_#ef4444]" />
                            <div className="absolute w-24 h-24 border border-gcs-primary rounded-full" />
                        </div>

                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            <div className="bg-slate-900/80 border border-slate-700 backdrop-blur-md px-4 py-3 rounded shadow-2xl max-w-[350px]">
                                <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                                    {[
                                        { l: 'LAT', v: telemetry.gps.lat.toFixed(6) },
                                        { l: 'LON', v: telemetry.gps.lon.toFixed(6) },
                                        { l: 'G_SPD', v: `${telemetry.speed.toFixed(1)}M/S` },
                                        { l: 'ALT', v: `${telemetry.altitude.toFixed(1)}M` },
                                        { l: 'SATS', v: telemetry.satellites },
                                        { l: 'D_HOME', v: `${telemetry.distanceFromHome.toFixed(0)}M` }
                                    ].map(stat => (
                                        <div key={stat.l}>
                                            <span className="text-[7px] text-slate-500 font-mono font-black block uppercase">{stat.l}</span>
                                            <span className="text-[10px] font-mono font-bold text-slate-100 block">{stat.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right bg-slate-900/80 border border-slate-700 backdrop-blur-md px-3 py-1.5 rounded">
                                <span className="text-[7px] font-mono text-slate-500 block uppercase">FLIGHT_TIME</span>
                                <span className="text-sm font-mono font-black text-gcs-primary neon-glow-red tabular-nums">{telemetry.flightTime}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Power & Neural Analytics */}
                <div className="col-span-1 flex flex-col gap-4 min-h-0">
                    <Panel title="BATTERY STATUS">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 bg-slate-900 border border-slate-800 p-3 rounded flex items-center justify-between">
                                <div>
                                    <span className="text-[8px] text-slate-500 uppercase font-black font-mono">VOLTAGE</span>
                                    <span className="text-lg font-mono font-black text-gcs-success">{telemetry.battery.voltage.toFixed(2)}V</span>
                                </div>
                                <div className="w-10 h-10 bg-slate-850 rounded border border-slate-800 flex items-center justify-center">
                                    <span className="text-xl font-black text-slate-100 font-mono">{telemetry.battery.percentage.toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="col-span-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="bg-gcs-primary neon-glow-red h-full transition-all duration-1000" style={{ width: `${telemetry.battery.percentage}%` }} />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="AI DETECTION">
                        <div className="flex flex-col gap-4">
                            <div className={`py-4 rounded flex flex-col items-center justify-center border transition-all duration-500 ${telemetry.aiStatus.waterConfirmed ? 'bg-gcs-success/10 border-gcs-success/50 neon-glow-green' : 'bg-slate-900/50 border-slate-800'}`}>
                                <span className="text-[8px] text-slate-500 uppercase font-black font-mono mb-1 tracking-widest">TARGET_ACQUISITION</span>
                                <span className={`text-sm font-black font-mono tracking-[0.2em] ${telemetry.aiStatus.waterConfirmed ? 'text-gcs-success animate-pulse' : 'text-slate-100'}`}>
                                    {telemetry.aiStatus.waterConfirmed ? 'TARGET_LOCKED' : telemetry.aiStatus.trackingProgress > 0 ? 'ANALYZING...' : 'SCANNING_'}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                    <span className="text-[7px] text-slate-500 uppercase font-black font-mono">CONFIDENCE</span>
                                    <span className="font-mono font-black text-xs text-slate-100 block">{telemetry.aiStatus.sharpnessScore}</span>
                                </div>
                                <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                    <span className="text-[7px] text-slate-500 uppercase font-black font-mono">LATENCY</span>
                                    <span className="font-mono font-black text-xs text-slate-100 block">{telemetry.aiStatus.totalPipelineSpeedMs.toFixed(0)}MS</span>
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="PAYLOAD SYSTEM" className="flex-1 min-h-0">
                        <div className="flex flex-col gap-4 h-full">
                            <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[8px] text-slate-500 uppercase font-black font-mono">STORAGE_TANK</span>
                                    <span className="font-mono text-slate-100 text-[10px] font-bold">975ML_REMAINING</span>
                                </div>
                                <div className="w-full bg-slate-800 h-4 rounded-sm relative overflow-hidden border border-slate-700">
                                    <div className="bg-gradient-to-r from-slate-700 to-gcs-primary h-full transition-all duration-500" style={{ width: '65%' }} />
                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-100 font-mono tracking-widest mix-blend-difference">CAPACITY_65%</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => fetch('/api/drone/spray', { method: 'POST' })}
                                disabled={!telemetry.aiStatus.waterConfirmed}
                                className={`w-full py-4 rounded font-black font-mono text-xs tracking-[0.3em] transition-all border-2 ${
                                    telemetry.aiStatus.waterConfirmed 
                                    ? 'bg-gcs-primary border-gcs-primary text-slate-100 neon-glow-red shadow-xl' 
                                    : 'bg-transparent border-slate-800 text-slate-700 cursor-not-allowed'
                                }`}
                            >
                                MANUAL SPRAY
                            </button>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default DroneStreamView;
