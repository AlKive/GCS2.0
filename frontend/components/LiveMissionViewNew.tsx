import React, { useState, useEffect } from 'react';
import type { LiveTelemetry, BreedingSiteInfo } from 'types';
import MissionTrackMap from './MissionTrackMap'; 

// --- MAIN COMPONENT ---
interface LiveMissionViewProps {
  telemetry: LiveTelemetry;
  onEndMission?: () => void;
  mapStyle: string;
  embedded?: boolean;
}

const LiveMissionViewNew: React.FC<LiveMissionViewProps> = ({ telemetry, onEndMission, mapStyle, embedded = false }) => {
  const [showEndConfirm, setShowEndEndConfirm] = useState(false);
  const [missionSeconds, setMissionSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMissionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 bg-black z-[150] flex flex-col overflow-hidden animate-fade-in font-mono`}>
      {/* Background HUD Grid */}
      <div className="absolute inset-0 hud-grid opacity-20 pointer-events-none" />

      {/* Top HUD Bar */}
      <div className="relative z-10 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md px-6 py-3 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-8">
          <div>
            <span className="text-[8px] text-slate-500 uppercase tracking-[0.3em] font-black block mb-1">MISSION_TIME</span>
            <span className="text-xl font-black text-gcs-primary neon-glow-red tabular-nums">{formatTime(missionSeconds)}</span>
          </div>
          <div className="h-10 w-px bg-slate-800" />
          <div>
            <span className="text-[8px] text-slate-500 uppercase tracking-[0.3em] font-black block mb-1">STATUS</span>
            <span className="text-sm font-black text-gcs-success flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gcs-success animate-pulse shadow-[0_0_8px_#10b981]" />
                EN_ROUTE_ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[8px] text-slate-500 uppercase tracking-[0.3em] font-black block mb-1">UNIT_ID</span>
            <span className="text-sm font-black text-slate-100">LIPAD_ALPHA_01</span>
          </div>
          <button 
            onClick={() => setShowEndEndConfirm(true)}
            className="bg-gcs-primary hover:bg-red-600 text-slate-100 px-6 py-2 rounded font-black text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95 neon-glow-red"
          >
            TERMINATE_MISSION
          </button>
        </div>
      </div>

      {/* Main HUD Content */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Primary Optical Feed */}
        <div className="absolute inset-0 bg-[#0a0c14] flex items-center justify-center">
            <div className="w-full h-full relative opacity-40">
                <iframe src="/camera_feed" className="w-full h-full border-0" title="HUD Feed" />
            </div>
            {/* Center Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-32 h-px bg-gcs-primary" />
                <div className="h-32 w-px bg-gcs-primary" />
                <div className="absolute w-48 h-48 border border-gcs-primary rounded-full" />
            </div>
        </div>

        {/* HUD Overlays - Left */}
        <div className="relative z-10 w-80 p-6 flex flex-col gap-4 pointer-events-none">
            {/* Attitude Indicator HUD */}
            <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md p-4 rounded shadow-2xl pointer-events-auto">
                <span className="text-[8px] text-slate-500 font-black tracking-widest block mb-4 uppercase">FLIGHT_DYNAMICS_</span>
                <div className="space-y-3">
                    <HudStat label="PITCH" value={`${telemetry.pitch.toFixed(1)}°`} />
                    <HudStat label="ROLL" value={`${telemetry.roll.toFixed(1)}°`} />
                    <HudStat label="YAW" value={`${telemetry.heading.toFixed(1)}°`} />
                </div>
            </div>

            {/* AI Core HUD */}
            <div className={`bg-slate-900/60 border border-slate-800 backdrop-blur-md p-4 rounded shadow-2xl pointer-events-auto transition-all duration-500 ${telemetry.aiStatus.waterConfirmed ? 'neon-border-red border-gcs-primary/50' : ''}`}>
                <span className="text-[8px] text-slate-500 font-black tracking-widest block mb-4 uppercase">NEURAL_PROC_V4_</span>
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-100 font-black">TARGET_ACQ</span>
                        <span className={`text-[10px] font-black ${telemetry.aiStatus.waterConfirmed ? 'text-gcs-primary animate-pulse' : 'text-slate-500'}`}>
                            {telemetry.aiStatus.waterConfirmed ? 'LOCKED' : 'SCANNING'}
                        </span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gcs-primary shadow-[0_0_8px_#ef4444]" style={{ width: telemetry.aiStatus.waterConfirmed ? '100%' : `${telemetry.aiStatus.trackingProgress * 20}%` }} />
                    </div>
                </div>
            </div>
        </div>

        {/* HUD Overlays - Center (Bottom) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-[600px] flex flex-col gap-4 pointer-events-none">
            <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl px-8 py-4 rounded shadow-2xl flex justify-between items-center pointer-events-auto">
                <HudMainStat label="ALTITUDE" value={`${telemetry.altitude.toFixed(1)}M`} color="text-slate-100" />
                <div className="w-px h-10 bg-slate-800" />
                <HudMainStat label="GROUND_SPD" value={`${telemetry.speed.toFixed(1)}M/S`} color="text-gcs-success" />
                <div className="w-px h-10 bg-slate-800" />
                <HudMainStat label="BATT_LVL" value={`${telemetry.battery.percentage.toFixed(0)}%`} color={telemetry.battery.percentage > 20 ? "text-slate-100" : "text-gcs-error"} />
            </div>
        </div>

        {/* HUD Overlays - Right */}
        <div className="relative z-10 w-80 ml-auto p-6 flex flex-col gap-4 pointer-events-none">
            {/* Tactical Map Overlay */}
            <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md rounded overflow-hidden shadow-2xl h-64 pointer-events-auto relative">
                <div className="absolute top-0 left-0 right-0 z-20 bg-slate-900/80 p-2 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">TACTICAL_MAP_V2</span>
                    <span className="text-[8px] text-gcs-success font-black">GPS_FIX_STABLE</span>
                </div>
                <div className="w-full h-full opacity-80">
                    <MissionTrackMap 
                        track={telemetry.gpsTrack}
                        mapStyle={mapStyle}
                    />
                </div>
            </div>

            {/* Navigation HUD */}
            <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-md p-4 rounded shadow-2xl pointer-events-auto">
                <span className="text-[8px] text-slate-500 font-black tracking-widest block mb-4 uppercase">NAV_TELEMETRY_</span>
                <div className="space-y-2">
                    <HudStat label="LAT" value={telemetry.gps.lat.toFixed(6)} />
                    <HudStat label="LON" value={telemetry.gps.lon.toFixed(6)} />
                    <HudStat label="DIST_HOME" value={`${telemetry.distanceFromHome.toFixed(0)}M`} />
                </div>
            </div>
        </div>
      </div>

      {/* Confirmation Dialog Overlay */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <div className="relative bg-gcs-panel border border-gcs-primary p-8 rounded-lg max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-scale-in">
                <div className="mb-8">
                    <h2 className="text-xl font-black text-slate-100 uppercase tracking-[0.2em] font-mono mb-2">ABORT_CONFIRMATION_</h2>
                    <p className="text-xs text-slate-500 font-mono leading-relaxed">Confirm immediate termination of tactical link and unit return protocol.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowEndEndConfirm(false)} 
                        className="flex-1 py-3 text-[10px] font-black font-mono border border-slate-700 text-slate-500 hover:text-slate-300 rounded transition-all uppercase tracking-widest"
                    >
                        NEGATE_
                    </button>
                    <button 
                        onClick={() => onEndMission?.()} 
                        className="flex-1 py-3 text-[10px] font-black font-mono bg-gcs-primary text-slate-100 rounded shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all uppercase tracking-widest neon-glow-red"
                    >
                        CONFIRM_EXIT_
                    </button>
                </div>
            </div>
        </div>
      )}

      <style>{`
        .animate-scale-in {
            animation: scaleIn 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const HudStat: React.FC<{ label: string, value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between items-center">
        <span className="text-[9px] text-slate-500 font-black tracking-widest">{label}_</span>
        <span className="text-[10px] text-slate-100 font-black">{value}</span>
    </div>
);

const HudMainStat: React.FC<{ label: string, value: string | number, color: string }> = ({ label, value, color }) => (
    <div className="text-center">
        <span className="text-[8px] text-slate-500 font-black tracking-[0.2em] block mb-1 uppercase">{label}</span>
        <span className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</span>
    </div>
);

export default LiveMissionViewNew;
