import React, { useState, useEffect } from 'react';
import type { LiveTelemetry, BreedingSiteInfo } from 'types';
// We will use a placeholder for the map
import MissionTrackMap from './MissionTrackMap'; 

// --- THEME CONSTANTS (Tailwind Arbitrary Values mapped from UI Design) ---
// Base BG: #0f171e
// Panel BG: #1a242f
// Header BG: #141d26
// Border: #2c3e50
// Dim Text: #8b9bb4
// Accent Blue: #00a8ff
// Accent Green: #00e676
// Accent Red: #ff5252

// --- Reusable Panel Component ---
const Panel: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-[#1a242f] border border-[#2c3e50] rounded-md flex flex-col overflow-hidden ${className}`}>
        <div className="bg-[#141d26] px-3 py-1.5 border-b border-[#2c3e50] text-[#8b9bb4] text-xs font-semibold uppercase tracking-wider">
            {title}
        </div>
        <div className="p-3 flex-1 flex flex-col">
            {children}
        </div>
    </div>
);

// ---
// Gauges are compact (w-28 h-28)
// ---
const GaugeWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`relative w-28 h-28 bg-[#141d26] rounded-full border-2 border-[#2c3e50] flex items-center justify-center shadow-inner ${className}`}>
        {children}
    </div>
);

// --- Instrument Components ---

const Speedometer: React.FC<{ speed: number }> = ({ speed }) => {
    const SPEED_MAX = 22;
    const angle = Math.min(speed, SPEED_MAX) / SPEED_MAX * 270 - 135;
    return (
        <GaugeWrapper>
            <div className="absolute w-full h-full">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * (270 / 11) - 135}deg)` }}>
                        <div className="w-0.5 h-3 bg-white/20 absolute top-2.5 left-1/2 -ml-0.25 rounded-full"></div>
                    </div>
                ))}
            </div>
            <div className="absolute w-full h-full text-[#8b9bb4] text-xs text-center" style={{transform: `rotate(135deg)`}}>
                <span className="absolute" style={{transform: 'rotate(-135deg) translateY(-3.2rem)'}}>0</span>
                <span className="absolute" style={{transform: 'rotate(-90deg) translateY(-3.2rem)'}}>6</span>
                <span className="absolute" style={{transform: 'rotate(0deg) translateY(-3.2rem)'}}>12</span>
                <span className="absolute" style={{transform: 'rotate(90deg) translateY(-3.2rem)'}}>20</span>
                <span className="absolute" style={{transform: 'rotate(135deg) translateY(-3.2rem)'}}>22</span>
            </div>
            <div className="absolute w-1 h-1/2 bg-transparent top-0 left-1/2 -ml-0.5 origin-bottom transition-transform duration-200" style={{ transform: `rotate(${angle}deg)` }}>
                <div className="w-1 h-12 bg-[#00e676] rounded-t-full shadow-[0_0_8px_#00e676]" />
            </div>
            <div className="relative z-10 text-center bg-[#141d26]/80 p-1 rounded-lg backdrop-blur-sm">
                <p className="text-[10px] text-[#8b9bb4]">SPEED</p>
                <p className="text-lg font-mono font-bold text-white">{speed.toFixed(1)}</p>
            </div>
        </GaugeWrapper>
    );
};

const AttitudeIndicatorGauge: React.FC<{ roll: number; pitch: number }> = ({ roll, pitch }) => {
    return (
        <GaugeWrapper className="overflow-hidden">
            <div className="w-full h-full rounded-full overflow-hidden transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-roll}deg)` }}>
                <div className="absolute w-full h-[200%] bg-[#00a8ff] top-[-50%]" style={{ transform: `translateY(${-pitch * 2.5}px)` }}>
                    <div className="h-1/2 bg-[#8b572a] absolute bottom-0 w-full border-t-2 border-white/50" />
                </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 100 50" fill="none" className="w-16 h-8 drop-shadow-md">
                    <path d="M50 25 L30 35 M50 25 L70 35 M50 25 L50 10 M10 25 H 90" stroke="#f39c12" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        </GaugeWrapper>
    );
};

const HeadingIndicator: React.FC<{ heading: number }> = ({ heading }) => {
    const cardinals = ['N', 'E', 'S', 'W'];
    return (
        <GaugeWrapper>
            <div className="absolute w-[120%] h-[120%] rounded-full transition-transform duration-200" style={{ transform: `rotate(${-heading}deg)` }}>
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 30}deg)` }}>
                        <div className={`absolute top-2.5 left-1/2 -ml-0.5 ${i % 3 === 0 ? 'w-0.5 h-4 bg-[#00a8ff]' : 'w-px h-2.5 bg-[#2c3e50]'}`} />
                        {i % 3 === 0 && <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm font-bold text-white">{cardinals[i/3]}</span>}
                    </div>
                ))}
            </div>
             <div className="absolute inset-0 flex items-center justify-center">
                 <svg viewBox="0 0 50 50" fill="#00e676" className="w-6 h-6 drop-shadow-[0_0_5px_rgba(0,230,118,0.5)]"><path d="M25 5 L40 45 L25 35 L10 45 Z" /></svg>
             </div>
             <div className="absolute top-2 text-[#00e676] font-mono text-xs font-bold bg-[#141d26]/80 px-1 rounded">{Math.round(heading)}°</div>
        </GaugeWrapper>
    );
};

const VerticalSpeedIndicator: React.FC<{ vspeed: number }> = ({ vspeed }) => {
    const VSPEED_MAX = 10;
    const angle = Math.max(-VSPEED_MAX, Math.min(vspeed, VSPEED_MAX)) / VSPEED_MAX * 90;
    return (
        <GaugeWrapper>
            <div className="absolute w-full h-full text-[#8b9bb4] text-xs">
                <span className="absolute top-1/2 -translate-y-1/2 left-3 text-white">0</span>
                <span className="absolute top-1/4 -translate-y-1/2 left-4">6</span>
                <span className="absolute bottom-1/4 translate-y-1/2 left-4">6</span>
                <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px]">UP</span>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px]">DN</span>
            </div>
             <div className="absolute w-1/2 h-0.5 bg-transparent top-1/2 -mt-px right-0 origin-left transition-transform duration-200" style={{ transform: `rotate(${angle}deg)` }}>
                <div className="w-full h-0.5 bg-[#00e676] rounded-r-full shadow-[0_0_5px_#00e676]" />
             </div>
            <div className="relative z-10 text-center bg-[#141d26]/80 p-1 rounded-lg backdrop-blur-sm">
                <p className="text-[10px] text-[#8b9bb4]">V.SPEED</p>
                <p className="text-lg font-mono font-bold text-white">{vspeed.toFixed(1)}</p>
            </div>
        </GaugeWrapper>
    );
};

// --- Flight Instruments Panel ---
const FlightInstruments: React.FC<{ telemetry: LiveTelemetry }> = ({ telemetry }) => {
  return (
    <Panel title="Instruments">
      <div className="grid grid-cols-2 gap-2 justify-items-center h-full items-center">
          <Speedometer speed={telemetry.speed} />
          <AttitudeIndicatorGauge roll={telemetry.roll} pitch={telemetry.pitch} />
          <HeadingIndicator heading={telemetry.heading} />
          <VerticalSpeedIndicator vspeed={telemetry.verticalSpeed} />
      </div>
    </Panel>
  );
};

// --- Modes Panel ---
const ModeButton: React.FC<{ label: string, active: boolean, isError?: boolean }> = ({ label, active, isError }) => {
  let bgClass = 'bg-[#141d26] text-[#8b9bb4] border border-[#2c3e50]';
  if (active) {
      bgClass = isError 
        ? 'bg-[#ff5252]/20 text-[#ff5252] border border-[#ff5252] shadow-[0_0_10px_rgba(255,82,82,0.2)]'
        : 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676] shadow-[0_0_10px_rgba(0,230,118,0.2)]';
  }

  return (
    <div className={`flex items-center justify-center py-1.5 px-1 rounded transition-all ${bgClass}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
};

const ModesPanel: React.FC<{ telemetry: LiveTelemetry }> = ({ telemetry }) => {
  return (
    <Panel title="System Modes">
      <div className="grid grid-cols-2 gap-2">
        {/* Adjusted to include payload/detection specific modes typical for specialized GCS */}
        <ModeButton label={telemetry.armed ? "ARMED" : "DISARMED"} active={telemetry.armed} isError={!telemetry.armed} />
        <ModeButton label="ANGLE" active={telemetry.modes.angle} />
        <ModeButton label="OBJ DETECT" active={telemetry.modes.surface || false} /> 
        <ModeButton label="LARVICIDE" active={telemetry.modes.mcBraking || false} />
        <ModeButton label="POS HOLD" active={telemetry.modes.positionHold} />
        <ModeButton label="RTH" active={telemetry.modes.returnToHome} />
        <ModeButton label="ALT HOLD" active={telemetry.modes.altitudeHold} />
        <ModeButton label="HDG HOLD" active={telemetry.modes.headingHold} />
      </div>
    </Panel>
  );
};

// --- Telemetry Panel ---
const TelemetryPanel: React.FC<{ telemetry: LiveTelemetry }> = ({ telemetry }) => {
  return (
    <Panel title="Core Telemetry">
      <div className="grid grid-cols-2 gap-2 h-full">
        <div className="flex flex-col items-center justify-center bg-[#141d26] border border-[#2c3e50] rounded-md py-2">
          <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">RC Link</span>
          <span className="font-mono text-lg font-bold text-[#00e676]">{telemetry.signalStrength}<span className="text-xs text-[#8b9bb4] ml-1">dBm</span></span>
        </div>
        <div className="flex flex-col items-center justify-center bg-[#141d26] border border-[#2c3e50] rounded-md py-2">
          <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Battery</span>
          <span className="font-mono text-lg font-bold text-[#00a8ff]">{telemetry.battery.percentage.toFixed(0)}%</span>
          <span className="text-[10px] text-[#8b9bb4]">{telemetry.battery.voltage.toFixed(1)}V</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-[#141d26] border border-[#2c3e50] rounded-md py-2">
          <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Satellites</span>
          <span className="font-mono text-lg font-bold text-white">{telemetry.satellites}</span>
          <span className="text-[10px] text-[#00e676]">3D Fix</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-[#141d26] border border-[#2c3e50] rounded-md py-2">
          <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider">Dist to Home</span>
          <span className="font-mono text-lg font-bold text-white">{telemetry.distanceFromHome.toFixed(0)}<span className="text-xs text-[#8b9bb4] ml-1">m</span></span>
        </div>
      </div>
    </Panel>
  );
};

// --- Main Live View Component ---
interface LiveMissionViewProps {
  telemetry: LiveTelemetry;
  onEndMission?: (durationSeconds: number, gpsTrack: { lat: number; lon: number }[], detectedSites: BreedingSiteInfo[]) => void;
  mapStyle: string;
  embedded?: boolean;
}

const LiveMissionViewNew: React.FC<LiveMissionViewProps> = ({ telemetry, onEndMission, mapStyle, embedded = false }) => {
  const [isConfirmingEndMission, setConfirmingEndMission] = useState(false);
  const missionName = "Sector 7G"; 
  const [feedError, setFeedError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [missionSeconds, setMissionSeconds] = useState(0);

  const handleFeedError = () => {
    console.warn('[Camera Feed] Error detected, will retry in 3 seconds...');
    if (!feedError) {
      setFeedError(true);
      setTimeout(() => {
        setFeedError(false);
        setReloadKey(k => k + 1);
      }, 3000);
    }
  };

  useEffect(() => {
    if (embedded) return;
    setMissionSeconds(0); 
    const timer = setInterval(() => {
      setMissionSeconds(seconds => seconds + 1);
    }, 1000); 
    return () => clearInterval(timer); 
  }, [embedded]); 

  const formattedMissionTime = `${Math.floor(missionSeconds / 60).toString().padStart(2, '0')}:${(missionSeconds % 60).toString().padStart(2, '0')}`;

  const containerClasses = embedded 
    ? "h-full w-full bg-[#0f171e] text-[#e0e6ed] font-sans p-4 flex flex-col gap-4 overflow-hidden"
    : "fixed inset-0 bg-[#0f171e] text-[#e0e6ed] font-sans z-50 p-4 flex flex-col gap-4 animate-fade-in";

  return (
    <div className={containerClasses}>
      
      {/* Top Bar: Mission Name & End Button */}
      <div className="flex justify-between items-center bg-[#1a242f] px-4 py-2 border border-[#2c3e50] rounded-lg shadow-md">
        <h1 className="text-lg font-bold text-[#00a8ff] tracking-wide">
          {embedded ? "DRONE STREAM" : "LIVE MISSION"}: <span className="text-white ml-2">{missionName}</span>
        </h1>
        <div className="flex items-center gap-6">
          <div className="text-right border-r border-[#2c3e50] pr-6">
            <span className="text-[10px] uppercase tracking-widest text-[#8b9bb4]">
              {embedded ? "Uptime" : "Mission Time"}
            </span>
            <p className="font-mono text-xl font-bold text-white">{formattedMissionTime}</p>
          </div>
          {!embedded && onEndMission && (
            <button
              onClick={() => setConfirmingEndMission(true)}
              className="bg-[#ff5252]/10 text-[#ff5252] border border-[#ff5252] hover:bg-[#ff5252] hover:text-white font-bold py-1.5 px-6 rounded transition-all duration-200 uppercase text-sm tracking-wider"
            >
              End Mission
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {/* Left Column: Map/Camera */}
        <div className="col-span-2 bg-black rounded-lg border border-[#2c3e50] shadow-inner overflow-hidden relative flex items-center justify-center">
          <iframe
            key={reloadKey}
            src={`/camera_feed`}
            className="absolute inset-0 w-full h-full border-0"
            title="Live Camera Feed"
            onError={handleFeedError}
            style={{ background: '#0f171e' }}
          />
          {feedError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f171e]/90 z-20">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-[#2c3e50] border-t-[#00a8ff] rounded-full animate-spin mb-4"></div>
                <p className="text-[#8b9bb4] text-center text-sm uppercase tracking-wider">
                  Camera feed unavailable<br/>
                  <span className="text-xs text-[#00a8ff]">Reconnecting...</span>
                </p>
              </div>
            </div>
          )}
          
          {/* OSD (On-Screen Display) */}
          <div className="absolute top-4 left-4 flex gap-3 z-10">
              <div className="bg-[#0f171e]/60 border border-[#2c3e50]/50 backdrop-blur-md px-3 py-1.5 rounded">
                <span className="text-[10px] font-bold uppercase text-[#8b9bb4] block mb-0.5">LAT / LON</span>
                <p className="font-mono text-sm text-[#00a8ff]">{telemetry.gps.lat.toFixed(6)}</p>
                <p className="font-mono text-sm text-[#00a8ff]">{telemetry.gps.lon.toFixed(6)}</p>
              </div>
          </div>

          <div className="absolute bottom-4 left-4 flex gap-3 z-10">
              <div className="bg-[#0f171e]/60 border border-[#2c3e50]/50 backdrop-blur-md px-3 py-1.5 rounded min-w-[90px]">
                <span className="text-[10px] font-bold uppercase text-[#8b9bb4] block mb-0.5">ALTITUDE</span>
                <p className="font-mono text-lg text-white">{telemetry.altitude.toFixed(1)} <span className="text-xs text-[#00e676]">m</span></p>
              </div>
              <div className="bg-[#0f171e]/60 border border-[#2c3e50]/50 backdrop-blur-md px-3 py-1.5 rounded min-w-[90px]">
                <span className="text-[10px] font-bold uppercase text-[#8b9bb4] block mb-0.5">GROUND SPD</span>
                <p className="font-mono text-lg text-white">{telemetry.speed.toFixed(1)} <span className="text-xs text-[#00e676]">m/s</span></p>
              </div>
          </div>

          {/* Mini-Map */}
          <div className="absolute top-4 right-4 w-56 h-48 bg-[#1a242f]/90 border border-[#2c3e50] rounded backdrop-blur-md p-2 flex flex-col z-10 shadow-lg">
            <div className="text-[10px] uppercase tracking-wider text-[#8b9bb4] mb-2 flex justify-between">
                <span>Map Overlay</span>
                <span className="text-[#00e676]">GPS FIX</span>
            </div>
            <div className="flex-1 bg-[#0f171e] rounded border border-[#2c3e50] flex items-center justify-center overflow-hidden">
                <span className="text-[#2c3e50] text-xs font-mono">Map Data Loading...</span>
            </div>
          </div>
        </div>

        {/* Right Column: Instruments, Modes, Telemetry */}
        <div className="col-span-1 flex flex-col gap-4 overflow-hidden">
          <FlightInstruments telemetry={telemetry} />
          <ModesPanel telemetry={telemetry} />
          <TelemetryPanel telemetry={telemetry} />
        </div>
      </main>

      {/* End Mission Confirmation Modal */}
      {isConfirmingEndMission && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" aria-modal="true" role="dialog">
            <div className="bg-[#1a242f] p-6 rounded-lg border border-[#2c3e50] max-w-sm w-full text-center shadow-2xl animate-dialog-in">
                <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">End Mission?</h2>
                <p className="text-sm text-[#8b9bb4] mb-6">This will halt all autonomous routines and finalize the telemetry logs.</p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => setConfirmingEndMission(false)} 
                        className="flex-1 py-2 text-sm bg-[#141d26] border border-[#2c3e50] hover:bg-[#2c3e50] text-[#e0e6ed] font-bold uppercase tracking-wider rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onEndMission(missionSeconds, telemetry.gpsTrack, telemetry.detectedSites)} 
                        className="flex-1 py-2 text-sm bg-[#ff5252] hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded shadow-[0_0_15px_rgba(255,82,82,0.4)] transition-all"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LiveMissionViewNew;
