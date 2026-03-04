import React, { useState, useEffect } from 'react';
import type { LiveTelemetry, BreedingSiteInfo } from 'types';

// --- Reusable Panel Component ---
const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-[#1a242f] border border-[#2c3e50] rounded-md flex flex-col overflow-hidden ${className}`}>
        <div className="bg-[#141d26] px-3 py-1.5 border-b border-[#2c3e50] text-[#8b9bb4] text-[10px] font-bold uppercase tracking-wider">
            {title}
        </div>
        <div className="p-3 flex-1 flex flex-col">
            {children}
        </div>
    </div>
);

const StatusIndicator: React.FC<{ label: string; active: boolean; color?: string }> = ({ label, active, color = 'bg-[#00e676]' }) => (
    <div className="flex items-center justify-between py-1 border-b border-[#2c3e50]/50 last:border-0">
        <span className="text-[10px] text-[#8b9bb4] uppercase">{label}</span>
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${active ? color : 'bg-gray-600'} ${active ? 'animate-pulse' : ''}`} />
            <span className={`text-[10px] font-bold ${active ? 'text-white' : 'text-gray-500'}`}>{active ? 'OK' : 'FAIL'}</span>
        </div>
    </div>
);

// --- Larger Gauge Wrapper ---
const GaugeWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`relative w-28 h-28 bg-[#141d26] rounded-full border-2 border-[#2c3e50] flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] ${className}`}>
        {children}
    </div>
);

// --- Detailed Instruments ---

const AttitudeIndicatorGauge: React.FC<{ roll: number; pitch: number }> = ({ roll, pitch }) => {
    return (
        <GaugeWrapper className="overflow-hidden scale-95">
            <div className="w-full h-full rounded-full overflow-hidden transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-roll}deg)` }}>
                <div className="absolute w-full h-[300%] bg-[#00a8ff] top-[-100%]" style={{ transform: `translateY(${-pitch * 2.5}px)` }}>
                    <div className="h-1/2 bg-[#8b572a] absolute bottom-0 w-full border-t-2 border-white/50" />
                    {/* Pitch markings */}
                    {[10, 20, 30, -10, -20, -30].map(p => (
                         <div key={p} className="absolute w-full flex justify-center" style={{ top: `calc(50% - ${p * 2.5}px)` }}>
                             <div className={`h-px bg-white/40 ${Math.abs(p) === 20 ? 'w-8' : 'w-4'}`} />
                             <span className="absolute -left-6 -top-1.5 text-[8px] text-white/40">{Math.abs(p)}</span>
                         </div>
                    ))}
                </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M20 50 H 40 M60 50 H 80 M50 45 V 55" stroke="#f39c12" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="2" fill="#f39c12" />
                </svg>
            </div>
            <div className="absolute top-2 text-[8px] font-bold text-[#8b9bb4] uppercase tracking-tighter">Attitude</div>
        </GaugeWrapper>
    );
};

const AltitudeGauge: React.FC<{ altitude: number }> = ({ altitude }) => {
    return (
        <GaugeWrapper className="scale-95">
            <div className="absolute w-full h-full">
                {[...Array(50)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 7.2}deg)` }}>
                        <div className={`absolute top-1.5 left-1/2 -ml-px rounded-full ${i % 5 === 0 ? 'w-0.5 h-3 bg-white/40' : 'w-px h-1.5 bg-white/20'}`} />
                        {i % 5 === 0 && (
                             <span className="absolute top-5 left-1/2 -translate-x-1/2 text-[8px] text-[#8b9bb4]" style={{ transform: `rotate(${-i * 7.2}deg)` }}>
                                 {i / 5}
                             </span>
                        )}
                    </div>
                ))}
            </div>
            <div className="relative z-10 text-center bg-[#141d26]/80 p-1 rounded-lg backdrop-blur-sm border border-[#2c3e50]">
                <p className="text-[8px] text-[#8b9bb4] font-bold">ALT</p>
                <p className="text-sm font-mono font-bold text-white leading-none">{altitude.toFixed(1)}</p>
                <p className="text-[9px] text-[#00a8ff] font-bold">M</p>
            </div>
            <div className="absolute w-1 h-1/2 bg-transparent top-0 left-1/2 -ml-0.5 origin-bottom transition-transform duration-300" style={{ transform: `rotate(${(altitude % 100) * 3.6}deg)` }}>
                <div className="w-1 h-10 bg-[#00a8ff] rounded-t-full shadow-[0_0_8px_#00a8ff]" />
            </div>
            <div className="absolute w-1.5 h-1/3 bg-transparent top-[16.6%] left-1/2 -ml-0.75 origin-bottom transition-transform duration-500" style={{ transform: `rotate(${(altitude % 1000) * 0.36}deg)` }}>
                <div className="w-1.5 h-7 bg-white/80 rounded-t-full" />
            </div>
        </GaugeWrapper>
    );
};

const HeadingIndicator: React.FC<{ heading: number }> = ({ heading }) => {
    const cardinals = ['N', 'E', 'S', 'W'];
    return (
        <GaugeWrapper className="scale-95">
            <div className="absolute w-[115%] h-[115%] rounded-full transition-transform duration-200" style={{ transform: `rotate(${-heading}deg)` }}>
                {[...Array(36)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 10}deg)` }}>
                        <div className={`absolute top-2.5 left-1/2 -ml-0.5 ${i % 9 === 0 ? 'w-0.5 h-4 bg-[#00a8ff]' : i % 3 === 0 ? 'w-px h-3 bg-white/40' : 'w-px h-1.5 bg-white/20'}`} />
                        {i % 9 === 0 && (
                             <span className="absolute top-6 left-1/2 -translate-x-1/2 text-xs font-black text-white" style={{ transform: `rotate(${-(i * 10 - heading) + heading}deg)` }}>
                                 {cardinals[i/9]}
                             </span>
                        )}
                    </div>
                ))}
            </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <svg viewBox="0 0 50 50" fill="#00e676" className="w-8 h-8 drop-shadow-[0_0_10px_rgba(0,230,118,0.5)]">
                     <path d="M25 5 L35 45 L25 38 L15 45 Z" />
                 </svg>
             </div>
             <div className="absolute top-2 text-[#00e676] font-mono text-[10px] font-black bg-[#0f171e] px-2 py-0.5 rounded-full border border-[#00e676]/30 shadow-[0_0_10px_rgba(0,230,118,0.2)]">
                 {Math.round(heading)}°
             </div>
        </GaugeWrapper>
    );
};

const VerticalSpeedIndicator: React.FC<{ vspeed: number }> = ({ vspeed }) => {
    const VSPEED_MAX = 10;
    const angle = Math.max(-VSPEED_MAX, Math.min(vspeed, VSPEED_MAX)) / VSPEED_MAX * 170;
    return (
        <GaugeWrapper className="scale-95">
            <div className="absolute w-full h-full">
                {[...Array(21)].map((_, i) => {
                    const val = i - 10;
                    const a = val * 17;
                    return (
                        <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${a}deg)` }}>
                            <div className={`absolute top-2 left-1/2 -ml-px ${val % 5 === 0 ? 'w-0.5 h-3 bg-white/40' : 'w-px h-1.5 bg-white/20'}`} />
                            {val % 5 === 0 && (
                                <span className="absolute top-5 left-1/2 -translate-x-1/2 text-[8px] text-[#8b9bb4]" style={{ transform: `rotate(${-a}deg)` }}>
                                    {Math.abs(val)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
             <div className="absolute w-1/2 h-0.5 bg-transparent top-1/2 -mt-px right-0 origin-left transition-transform duration-300" style={{ transform: `rotate(${angle - 90}deg)` }}>
                <div className="w-full h-1 bg-gradient-to-r from-transparent to-[#f39c12] rounded-r-full shadow-[0_0_8px_#f39c12]" />
             </div>
            <div className="relative z-10 text-center bg-[#141d26]/80 p-1 rounded-lg backdrop-blur-sm border border-[#2c3e50]">
                <p className="text-[8px] text-[#8b9bb4] font-bold uppercase">V-Spd</p>
                <p className="text-sm font-mono font-bold text-white leading-none">{vspeed.toFixed(1)}</p>
            </div>
        </GaugeWrapper>
    );
};

// --- Mode Selection View ---
const FlightModeTag: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
    <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all duration-300 border ${active ? 'bg-[#00a8ff]/20 text-[#00a8ff] border-[#00a8ff] shadow-[0_0_10px_rgba(0,168,255,0.3)]' : 'bg-[#141d26] text-[#8b9bb4] border-[#2c3e50]'}`}>
        {label}
    </div>
);

interface DroneStreamViewProps {
    telemetry: LiveTelemetry;
    onClose: () => void;
    mapStyle: string;
}

const DroneStreamView: React.FC<DroneStreamViewProps> = ({ telemetry, onClose, mapStyle }) => {
    const flightModes = [
        "POSITION HOLD",
        "ALTITUDE HOLD",
        "AIR MODE",
        "RETURN TO HOME",
        "ANGLE"
    ];

    return (
        <div className="fixed inset-0 bg-[#0f171e] text-[#e0e6ed] font-sans z-[100] flex flex-col overflow-hidden animate-fade-in">
            {/* Header / Top Bar */}
            <div className="bg-[#141d26] border-b border-[#2c3e50] px-4 py-1.5 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-1 hover:bg-[#2c3e50] rounded transition-colors text-[#8b9bb4] hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    </button>
                    <div>
                        <h1 className="text-xs font-bold tracking-widest text-[#00a8ff]">DRONE STREAM</h1>
                        <p className="text-[8px] text-[#8b9bb4] uppercase tracking-tighter">GEP-F405-HD V2 | RPi 4</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <span className="text-[7px] uppercase text-[#8b9bb4]">Connection</span>
                        <p className="text-[9px] font-bold text-[#00e676]">UART2 / MSP</p>
                    </div>
                    <div className="h-6 w-px bg-[#2c3e50]" />
                    <div className="text-right">
                        <span className="text-[7px] uppercase text-[#8b9bb4]">Status</span>
                        <p className={`text-[9px] font-bold ${telemetry.armed ? 'text-[#ff5252]' : 'text-[#00e676]'}`}>
                            {telemetry.armed ? 'ARMED' : 'READY'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content: 3 Panels */}
            <div className="flex-1 grid grid-cols-4 gap-2 p-2 min-h-0">
                
                {/* Left Panel: System Status & Instruments */}
                <div className="col-span-1 flex flex-col gap-2 min-h-0">
                    <Panel title="System Status" className="flex-shrink-0">
                        <div className="flex flex-col gap-1.5">
                            <div className={`py-1.5 rounded text-center font-black text-xs tracking-widest border-2 transition-all ${telemetry.armed ? 'bg-[#ff5252]/10 text-[#ff5252] border-[#ff5252] animate-pulse' : 'bg-[#141d26] text-[#8b9bb4] border-[#2c3e50]'}`}>
                                {telemetry.armed ? 'ARMED' : 'UNARMED'}
                            </div>
                            
                            <div className="flex flex-col gap-1 mt-0.5">
                                <span className="text-[7px] text-[#8b9bb4] uppercase font-bold tracking-widest">Flight Modes</span>
                                <div className="grid grid-cols-2 gap-1">
                                    {flightModes.map(mode => (
                                        <FlightModeTag key={mode} label={mode} active={telemetry.flightMode.toUpperCase().includes(mode.replace(' ', '')) || (mode === "AIR MODE" && telemetry.flightMode.toUpperCase() === "LOITER") || telemetry.flightMode.toUpperCase() === mode} />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-0.5 mt-1 border-t border-[#2c3e50] pt-1">
                                <StatusIndicator label="Gyroscope" active={true} />
                                <StatusIndicator label="Accelerometer" active={true} />
                                <StatusIndicator label="Barometer" active={true} />
                                <StatusIndicator label="GPS Link" active={telemetry.satellites > 0} />
                                <StatusIndicator label="RC Link" active={telemetry.signalStrength > -90} />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Instruments" className="flex-1 min-h-0">
                        <div className="grid grid-cols-2 gap-1.5 justify-items-center h-full items-center py-1">
                             <AltitudeGauge altitude={telemetry.altitude} />
                             <AttitudeIndicatorGauge roll={telemetry.roll} pitch={telemetry.pitch} />
                             <HeadingIndicator heading={telemetry.heading} />
                             <VerticalSpeedIndicator vspeed={telemetry.verticalSpeed} />
                        </div>
                    </Panel>
                </div>

                {/* Center Panel: Navigation & Core Telemetry */}
                <div className="col-span-2 flex flex-col gap-2 min-h-0">
                    <div className="flex-1 bg-black rounded border border-[#2c3e50] relative overflow-hidden">
                        <iframe
                            src={`/camera_feed`}
                            className="absolute inset-0 w-full h-full border-0"
                            title="Live Camera Feed"
                            style={{ background: '#0f171e' }}
                        />
                        
                        {/* Overlay: Attitude & Map */}
                        <div className="absolute top-2 left-2 flex gap-2">
                             <div className="scale-75 origin-top-left">
                                <AttitudeIndicatorGauge roll={telemetry.roll} pitch={telemetry.pitch} />
                             </div>
                        </div>

                        <div className="absolute top-2 right-2 w-40 h-32 bg-[#1a242f]/80 border border-[#2c3e50] rounded overflow-hidden shadow-2xl backdrop-blur-sm">
                             <div className="w-full h-full bg-[#0f171e] flex items-center justify-center text-[10px] text-[#8b9bb4] font-mono uppercase tracking-tighter">
                                 Map View
                             </div>
                        </div>

                        {/* GPS Data Overlay */}
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end gap-2">
                            <div className="bg-[#141d26]/85 border border-[#2c3e50] rounded p-2 backdrop-blur-sm flex-1 max-w-[320px]">
                                <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                                    <div className="min-w-0">
                                        <span className="text-[7px] text-[#8b9bb4] uppercase block truncate">Latitude</span>
                                        <span className="text-[10px] font-mono text-white truncate block">{telemetry.gps.lat.toFixed(6)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[7px] text-[#8b9bb4] uppercase block truncate">Longitude</span>
                                        <span className="text-[10px] font-mono text-white truncate block">{telemetry.gps.lon.toFixed(6)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[7px] text-[#8b9bb4] uppercase block truncate">Ground Spd</span>
                                        <span className="text-[10px] font-mono text-[#00e676] truncate block">{telemetry.speed.toFixed(1)} m/s</span>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[7px] text-[#8b9bb4] uppercase block truncate">Altitude</span>
                                        <span className="text-[10px] font-mono text-[#00a8ff] truncate block">{telemetry.altitude.toFixed(1)} m</span>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[7px] text-[#8b9bb4] uppercase block truncate">Sats</span>
                                        <span className="text-[10px] font-mono text-[#f39c12] truncate block">{telemetry.satellites}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-[7px] text-[#8b9bb4] uppercase block truncate">Dist. Home</span>
                                        <span className="text-[10px] font-mono text-white truncate block">{telemetry.distanceFromHome.toFixed(0)} m</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Systems Diagnostics */}
                <div className="col-span-1 flex flex-col gap-2 min-h-0">
                    <Panel title="Power & Battery" className="flex-shrink-0">
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="col-span-2 bg-[#141d26] p-1.5 rounded border border-[#2c3e50] flex items-center justify-between">
                                <div>
                                    <span className="text-[8px] text-[#8b9bb4] uppercase block font-bold">Voltage</span>
                                    <span className="text-base font-mono font-bold text-[#00e676]">{telemetry.battery.voltage.toFixed(2)}<span className="text-[10px] ml-0.5">V</span></span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] text-[#8b9bb4] uppercase block font-bold">Current</span>
                                    <span className="text-base font-mono font-bold text-[#00a8ff]">12.4<span className="text-[10px] ml-0.5">A</span></span>
                                </div>
                            </div>
                            <div className="bg-[#141d26] p-1 rounded border border-[#2c3e50] text-center">
                                <span className="text-[8px] text-[#8b9bb4] uppercase block">Consumed</span>
                                <span className="text-xs font-mono text-white">450 <span className="text-[8px] text-[#8b9bb4]">mAh</span></span>
                            </div>
                            <div className="bg-[#141d26] p-1 rounded border border-[#2c3e50] text-center">
                                <span className="text-[8px] text-[#8b9bb4] uppercase block">Level</span>
                                <span className="text-xs font-mono text-white font-black">{telemetry.battery.percentage.toFixed(0)}%</span>
                            </div>
                            <div className="col-span-2 h-2 bg-[#2c3e50] rounded-full overflow-hidden mt-0.5">
                                <div className="bg-gradient-to-r from-[#ff5252] via-[#f39c12] to-[#00e676] h-full transition-all duration-500" style={{ width: `${telemetry.battery.percentage}%` }} />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="AI Detection" className="flex-shrink-0">
                        <div className="flex flex-col gap-2">
                            <div className={`py-3 rounded flex flex-col items-center justify-center border transition-all duration-300 ${telemetry.detectedSites.length > 0 ? 'bg-[#ff5252]/10 border-[#ff5252] shadow-[0_0_15px_rgba(255,82,82,0.3)]' : 'bg-[#141d26] border-[#2c3e50]'}`}>
                                <span className="text-[8px] text-[#8b9bb4] uppercase font-bold mb-0.5">Target Status</span>
                                <span className={`text-sm font-black tracking-widest ${telemetry.detectedSites.length > 0 ? 'text-[#ff5252] animate-pulse' : 'text-white/10'}`}>
                                    {telemetry.detectedSites.length > 0 ? 'DETECTED' : 'SCANNING'}
                                </span>
                            </div>
                            <div className="bg-[#141d26] p-1.5 rounded border border-[#2c3e50] flex justify-between items-center">
                                <span className="text-[8px] text-[#8b9bb4] uppercase font-bold">Confirmed</span>
                                <span className="font-mono text-white font-black text-sm">{telemetry.detectedSites.length}</span>
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Spraying System" className="flex-1 min-h-0">
                        <div className="flex flex-col gap-2 h-full min-h-0">
                            <div className="bg-[#141d26] p-2 rounded border border-[#2c3e50] flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] text-[#8b9bb4] uppercase font-bold">Tank</span>
                                    <span className="font-mono text-white text-xs">1500 <span className="text-[8px] text-[#8b9bb4]">ml</span></span>
                                </div>
                                <div className="w-full bg-[#2c3e50] h-4 rounded-sm relative overflow-hidden">
                                    <div className="bg-gradient-to-r from-[#00a8ff] to-[#00e676] h-full transition-all duration-500" style={{ width: '65%' }} />
                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white drop-shadow-sm">975ml LEFT</span>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-[#141d26] p-1.5 rounded border border-[#2c3e50] flex flex-col min-h-0">
                                <span className="text-[7px] text-[#8b9bb4] uppercase mb-1 font-bold tracking-tighter">Rate (ml/s)</span>
                                <div className="flex-1 relative flex items-end gap-0.5 px-0.5">
                                    {[20, 45, 30, 60, 40, 25, 50, 45, 30, 55, 65, 40, 50, 35, 45, 30, 40].map((v, i) => (
                                        <div key={i} className="flex-1 bg-[#00a8ff]/40 rounded-t-[1px]" style={{ height: `${v}%` }} />
                                    ))}
                                </div>
                                <div className="flex justify-between mt-1 pt-1 border-t border-[#2c3e50]">
                                    <span className="text-[7px] text-[#8b9bb4] font-bold">TOTAL</span>
                                    <span className="text-[9px] font-black text-[#00a8ff]">525.4 ml</span>
                                </div>
                            </div>

                            <div className={`p-1.5 rounded border flex justify-between items-center transition-all ${telemetry.modes.mcBraking ? 'bg-[#00e676]/10 border-[#00e676]' : 'bg-[#141d26] border-[#2c3e50]'}`}>
                                <span className="text-[8px] text-[#8b9bb4] uppercase font-bold">Pump</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${telemetry.modes.mcBraking ? 'bg-[#00e676] animate-pulse' : 'bg-gray-600'}`} />
                                    <span className={`text-[8px] font-black uppercase ${telemetry.modes.mcBraking ? 'text-[#00e676]' : 'text-gray-500'}`}>{telemetry.modes.mcBraking ? 'ACTIVE' : 'IDLE'}</span>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </div>
    );
};

export default DroneStreamView;
