import React, { useState, useEffect } from 'react';
import type { LiveTelemetry, BreedingSiteInfo } from 'types';
// We will use a placeholder for the map
import MissionTrackMap from './MissionTrackMap'; 

// ---
// FIX #1: Gauges are compact (w-28 h-28, which is 7rem)
// ---
const GaugeWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`relative w-28 h-28 bg-[#0A1019] rounded-full border-2 border-gray-700 flex items-center justify-center ${className}`}>
        {children}
    </div>
);

// --- Instrument Components (Adjusted for new 10rem size) ---

const Speedometer: React.FC<{ speed: number }> = ({ speed }) => {
    const SPEED_MAX = 22;
    const angle = Math.min(speed, SPEED_MAX) / SPEED_MAX * 270 - 135;
    return (
        <GaugeWrapper>
            <div className="absolute w-full h-full">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * (270 / 11) - 135}deg)` }}>
                        <div className="w-0.5 h-3 bg-white/50 absolute top-2.5 left-1/2 -ml-0.25 rounded-full"></div>
                    </div>
                ))}
            </div>
            {/* Adjusted text size and position */}
            <div className="absolute w-full h-full text-white text-xs text-center" style={{transform: `rotate(135deg)`}}>
                <span className="absolute" style={{transform: 'rotate(-135deg) translateY(-3.2rem)'}}>0</span>
                <span className="absolute" style={{transform: 'rotate(-90deg) translateY(-3.2rem)'}}>6</span>
                <span className="absolute" style={{transform: 'rotate(0deg) translateY(-3.2rem)'}}>12</span>
                <span className="absolute" style={{transform: 'rotate(90deg) translateY(-3.2rem)'}}>20</span>
                <span className="absolute" style={{transform: 'rotate(135deg) translateY(-3.2rem)'}}>22</span>
            </div>
            {/* Adjusted pointer size */}
            <div className="absolute w-1 h-1/2 bg-transparent top-0 left-1/2 -ml-0.5 origin-bottom transition-transform duration-200" style={{ transform: `rotate(${angle}deg)` }}>
                <div className="w-1 h-12 bg-green-400 rounded-t-full" />
            </div>
            <div className="relative z-10 text-center bg-[#0A1019] p-1 rounded-lg">
                <p className="text-xs text-gray-400">SPEED</p>
                <p className="text-lg font-mono font-bold text-white">{speed.toFixed(1)}</p>
                <p className="text-xs text-gray-400">m/s</p>
            </div>
        </GaugeWrapper>
    );
};

const AttitudeIndicatorGauge: React.FC<{ roll: number; pitch: number }> = ({ roll, pitch }) => {
    return (
        <GaugeWrapper>
            <div className="w-full h-full rounded-full overflow-hidden transition-transform duration-100 ease-linear" style={{ transform: `rotate(${-roll}deg)` }}>
                <div className="absolute w-full h-[200%] bg-sky-400 top-[-50%]" style={{ transform: `translateY(${-pitch * 2.5}px)` }}>
                    <div className="h-1/2 bg-yellow-800 absolute bottom-0 w-full" />
                </div>
            </div>
            {/* Adjusted icon size */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 100 50" fill="none" className="w-16 h-8">
                    <path d="M50 25 L30 35 M50 25 L70 35 M50 25 L50 10 M10 25 H 90" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
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
                        <div className={`absolute top-2.5 left-1/2 -ml-0.5 ${i % 3 === 0 ? 'w-0.5 h-4 bg-white' : 'w-px h-2.5 bg-gray-400'}`} />
                        {/* Adjusted text size and position */}
                        {i % 3 === 0 && <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm font-bold text-white">{cardinals[i/3]}</span>}
                    </div>
                ))}
            </div>
             {/* Adjusted pointer size */}
             <div className="absolute inset-0 flex items-center justify-center">
                 <svg viewBox="0 0 50 50" fill="#2DD4BF" className="w-7 h-7 drop-shadow-lg"><path d="M25 5 L40 45 L25 35 L10 45 Z" /></svg>
             </div>
             <div className="absolute top-1 text-green-400 font-mono text-sm">{Math.round(heading)}°</div>
        </GaugeWrapper>
    );
};

const VerticalSpeedIndicator: React.FC<{ vspeed: number }> = ({ vspeed }) => {
    const VSPEED_MAX = 10;
    const angle = Math.max(-VSPEED_MAX, Math.min(vspeed, VSPEED_MAX)) / VSPEED_MAX * 90;
    return (
        <GaugeWrapper>
             {/* Adjusted text size and position */}
            <div className="absolute w-full h-full text-white text-xs">
                <span className="absolute top-1/2 -translate-y-1/2 left-3">0</span>
                <span className="absolute top-1/4 -translate-y-1/2 left-4">6</span>
                <span className="absolute bottom-1/4 translate-y-1/2 left-4">6</span>
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs">UP</span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs">DN</span>
            </div>
             <div className="absolute w-1/2 h-0.5 bg-transparent top-1/2 -mt-px right-0 origin-left transition-transform duration-200" style={{ transform: `rotate(${angle}deg)` }}>
                <div className="w-full h-0.5 bg-green-400 rounded-r-full" />
             </div>
            <div className="relative z-10 text-center bg-[#0A1019] p-1 rounded-lg">
                <p className="text-xs text-gray-400">V.SPEED</p>
                <p className="text-lg font-mono font-bold text-white">{vspeed.toFixed(1)}</p>
                <p className="text-xs text-gray-400">m/s</p>
            </div>
        </GaugeWrapper>
    );
};

// ---
// FIX #2: AltitudeTape is now part of the 4-gauge grid
// ---
const AltitudeTape: React.FC<{ altitude: number }> = ({ altitude }) => {
    const ALT_MAX = 120;
    const percent = Math.min(altitude, ALT_MAX) / ALT_MAX * 100;
    return (
        // Changed to be a square wrapper to fit the grid
        <div className="relative w-28 h-28">
          <div className="w-12 h-full mx-auto bg-[#0A1019] rounded-lg border-2 border-gray-700 flex flex-col justify-end relative overflow-hidden">
              <div className="absolute inset-0 text-white text-xs text-right pr-0.5">
                  {[...Array(7)].map((_,i) => <div key={i} style={{bottom: `${i * (100/6)}%`}} className="absolute w-full pr-1">{i * 20}</div>)}
              </div>
              <div className="bg-cyan-400/80 w-full transition-all duration-200" style={{ height: `${percent}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-8 bg-black/30 border-y-2 border-cyan-400 flex items-center justify-center">
                  <span className="font-mono text-cyan-300 font-bold text-sm">{altitude.toFixed(1)}</span>
              </div>
          </div>
        </div>
    );
};

// --- Flight Instruments Panel (Now much larger) ---

const FlightInstruments: React.FC<{ telemetry: LiveTelemetry }> = ({ telemetry }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-inner p-1.5">
      <h2 className="text-xs font-semibold uppercase text-gray-400 mb-1 text-center">Instruments</h2>
      {/* This is the new 2x2 grid for the 4 main gauges, making them
        take up a "quarter of the full display size" (half of the right panel)
      */}
      <div className="grid grid-cols-2 gap-1 justify-items-center">
          <Speedometer speed={telemetry.speed} />
          <AttitudeIndicatorGauge roll={telemetry.roll} pitch={telemetry.pitch} />
          <HeadingIndicator heading={telemetry.heading} />
          <VerticalSpeedIndicator vspeed={telemetry.verticalSpeed} />
      </div>
    </div>
  );
};

// --- Modes Panel (Unchanged from before) ---
const ModeButton: React.FC<{ label: string, active: boolean }> = ({ label, active }) => (
  <div
    className={`flex-1 text-center py-0.5 px-1 rounded-md transition-colors ${
      active
        ? 'bg-orange-600 text-white shadow-lg'
        : 'bg-gray-600/50 text-gray-300'
    }`}
  >
    <span className="text-[10px] font-semibold uppercase tracking-tight">{label}</span>
  </div>
);

const ModesPanel: React.FC<{ telemetry: LiveTelemetry }> = ({ telemetry }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-inner p-1.5">
      <h2 className="text-xs font-semibold uppercase text-gray-400 mb-0.5">Modes</h2>
      <div className="grid grid-cols-2 gap-1">
        <ModeButton label="ARM" active={telemetry.armed} />
        <ModeButton label="ANGLE" active={telemetry.modes.angle} />
        <ModeButton label="POSITION HOLD" active={telemetry.modes.positionHold} />
        <ModeButton label="RETURN TO HOME" active={telemetry.modes.returnToHome} />
        <ModeButton label="ALTITUDE HOLD" active={telemetry.modes.altitudeHold} />
        <ModeButton label="HEADING HOLD" active={telemetry.modes.headingHold} />
        <ModeButton label="AIRMODE" active={telemetry.modes.airmode} />
        <ModeButton label="SURFACE" active={telemetry.modes.surface} />
        <ModeButton label="MC BRAKING" active={telemetry.modes.mcBraking} />
        <ModeButton label="BEEPER" active={telemetry.modes.beeper} />
      </div>
    </div>
  );
};

// --- Telemetry Panel (2x2 Grid Layout) ---
const TelemetryPanel: React.FC<{ telemetry: LiveTelemetry }> = ({ telemetry }) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-inner p-1.5">
      <h2 className="text-xs font-semibold uppercase text-gray-400 mb-0.5">Telemetry</h2>
      {/* 2x2 Grid Layout */}
      <div className="grid grid-cols-2 gap-1">
        <div className="flex flex-col items-center justify-center bg-gray-700/50 py-1.5 px-1 rounded-md">
          <span className="text-[9px] text-gray-400 uppercase">Signal</span>
          <span className="font-mono text-xs font-semibold text-white">{telemetry.signalStrength}</span>
          <span className="text-[8px] text-gray-400">dBm</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-gray-700/50 py-1.5 px-1 rounded-md">
          <span className="text-[9px] text-gray-400 uppercase">Battery</span>
          <span className="font-mono text-xs font-semibold text-white">{telemetry.battery.percentage.toFixed(1)}%</span>
          <span className="text-[8px] text-gray-400">{telemetry.battery.voltage.toFixed(1)}V</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-gray-700/50 py-1.5 px-1 rounded-md">
          <span className="text-[9px] text-gray-400 uppercase">Satellites</span>
          <span className="font-mono text-xs font-semibold text-white">{telemetry.satellites}</span>
          <span className="text-[8px] text-gray-400">GPS</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-gray-700/50 py-1.5 px-1 rounded-md">
          <span className="text-[9px] text-gray-400 uppercase">Distance</span>
          <span className="font-mono text-xs font-semibold text-white">{telemetry.distanceFromHome.toFixed(0)}</span>
          <span className="text-[8px] text-gray-400">m</span>
        </div>
      </div>
    </div>
  );
};


// --- Main Live View Component ---

interface LiveMissionViewProps {
  telemetry: LiveTelemetry;
  onEndMission: (durationSeconds: number, gpsTrack: { lat: number; lon: number }[], detectedSites: BreedingSiteInfo[]) => void;
  mapStyle: string;
}

const LiveMissionView: React.FC<LiveMissionViewProps> = ({ telemetry, onEndMission, mapStyle }) => {
  const [isConfirmingEndMission, setConfirmingEndMission] = useState(false);
  const missionName = "Sector 7G"; 
  const [feedError, setFeedError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // retry the camera feed a few times if it fails (server may not be up immediately)
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

  // ---
  // FIX #3: Frontend-based Mission Timer
  // ---
  const [missionSeconds, setMissionSeconds] = useState(0);

  useEffect(() => {
    setMissionSeconds(0); 
    const timer = setInterval(() => {
      setMissionSeconds(seconds => seconds + 1);
    }, 1000); 
    return () => {
      clearInterval(timer); 
    };
  }, []); 

  const formattedMissionTime = `${Math.floor(missionSeconds / 60).toString().padStart(2, '0')}:${(missionSeconds % 60).toString().padStart(2, '0')}`;


  return (
    <div className="fixed inset-0 bg-gray-900 text-white font-sans z-50 p-4 flex flex-col gap-4 animate-fade-in">
      
      {/* Top Bar: Mission Name & End Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-orange-500">
          Live Mission: <span className="text-white">{missionName}</span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs uppercase text-gray-400">Mission Time</span>
            <p className="font-mono text-lg">{formattedMissionTime}</p>
          </div>
          <button
            onClick={() => setConfirmingEndMission(true)}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 transition-colors"
          >
            End Mission
          </button>
        </div>
      </div>

      {/* ---
        FIX #4: NEW 50/50 LAYOUT
      ---
      */}
      <main className="flex-1 grid grid-cols-3 gap-4 min-h-0">

        {/* Left Column: Map/Camera (2/3 width) */}
        <div className="col-span-2 bg-black rounded-lg shadow-inner overflow-hidden relative flex items-center justify-center">
          {/* camera feed from Python helper streamed as MJPEG using iframe for better compatibility */}
          <iframe
            key={reloadKey}
            src={`/camera_feed`}
            className="absolute inset-0 w-full h-full border-0"
            title="Live Camera Feed"
            onError={handleFeedError}
            style={{ background: 'black' }}
          />
          {feedError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <p className="text-gray-400 text-center">
                Camera feed unavailable<br/>
                <span className="text-xs text-gray-500">Retrying...</span>
              </p>
            </div>
          )}
          {/* OSD (On-Screen Display) Elements - positioned above the stream */}
          <div className="absolute top-4 left-4 p-2 bg-black/30 rounded z-10">
            <span className="text-xs uppercase text-gray-400">LAT</span>
            <p className="font-mono text-lg">{telemetry.gps.lat.toFixed(6)}</p>
          </div>
          <div className="absolute bottom-4 left-4 p-2 bg-black/30 rounded z-10">
            <span className="text-xs uppercase text-gray-400">ALT</span>
            <p className="font-mono text-lg">{telemetry.altitude.toFixed(1)} <span className="text-base">m</span></p>
          </div>
          <div className="absolute bottom-4 right-4 p-2 bg-black/30 rounded z-10">
            <span className="text-xs uppercase text-gray-400">SPD</span>
            <p className="font-mono text-lg">{telemetry.speed.toFixed(1)} <span className="text-base">m/s</span></p>
          </div>

          {/* Mini-Map */}
          <div className="absolute top-4 right-4 w-48 h-40 bg-gray-800/80 rounded-lg border border-gray-600 p-2 flex flex-col z-10">
            <span className="text-xs text-gray-400">Mini Map View</span>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-gray-500 text-sm">(Mini-Map)</span>
            </div>
            <p className="font-mono text-xs">{telemetry.gps.lat.toFixed(4)}</p>
            <p className="font-mono text-xs">{telemetry.gps.lon.toFixed(4)}</p>
          </div>
        </div>

        {/* Right Column: Instruments, Modes, Telemetry (1/3 width) */}
        <div className="col-span-1 flex flex-col gap-1.5 overflow-hidden">
          {/* The AltitudeTape is now part of the 2x2 grid */}
          <FlightInstruments telemetry={telemetry} />
          <ModesPanel telemetry={telemetry} />
          <TelemetryPanel telemetry={telemetry} />
        </div>
        
      </main>
      {/* --- END OF NEW LAYOUT --- */}


      {/* End Mission Confirmation Modal */}
      {isConfirmingEndMission && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-60" aria-modal="true" role="dialog">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-white/10 max-w-sm text-center animate-dialog-in">
                <h2 className="text-lg font-bold text-white mb-2">Confirm End Mission</h2>
                <p className="text-sm text-gray-300 mb-4">Are you sure you want to end the current mission?</p>
                <div className="flex justify-center gap-3">
                    <button 
                        onClick={() => setConfirmingEndMission(false)} 
                        className="px-6 py-2 text-sm bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onEndMission(missionSeconds, telemetry.gpsTrack, telemetry.detectedSites)} 
                        className="px-6 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
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

// Animations for the view and dialog
const style = document.createElement('style');
style.innerHTML = `
@keyframes fade-in {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}
@keyframes dialog-in {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-dialog-in {
    animation: dialog-in 0.2s ease-out forwards;
}
`;
document.head.appendChild(style);

export default LiveMissionView;