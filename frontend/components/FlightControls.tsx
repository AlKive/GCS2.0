import React from 'react';
import type { LiveTelemetry } from 'types';

// Icons
const SignalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.556a8.889 8.889 0 0111.112-1.41M5.556 12.889a13.333 13.333 0 0116.11-2.044M3 9.222a17.778 17.778 0 0120.222-2.388M12 18.222h.01" /></svg>;
const BatteryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const SatelliteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;

const TelemetryItem: React.FC<{ label: string; value: string | number; subValue?: string; icon: React.ReactNode }> = ({ label, value, subValue, icon }) => (
    <div className="flex items-center justify-between p-3 bg-gcs-card border border-main rounded-lg">
        <div className="flex items-center gap-3">
            <div className="text-gcs-primary neon-glow">{icon}</div>
            <span className="text-[10px] font-mono text-dim uppercase tracking-widest">{label}</span>
        </div>
        <div className="text-right">
          <span className="font-mono text-main font-bold">{value}</span>
          {subValue && <span className="text-[8px] font-mono text-dim ml-1 uppercase">{subValue}</span>}
        </div>
    </div>
);

const ModeButton: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
    <div className={`p-2 rounded text-center font-black font-mono text-[9px] tracking-[0.2em] border transition-all duration-300 ${active ? 'bg-gcs-primary/10 text-gcs-primary border-gcs-primary/50 neon-glow-red' : 'bg-slate-900/50 text-slate-600 border-slate-800'}`}>
        {label}
    </div>
);


const FlightControls: React.FC<{ telemetry: LiveTelemetry }> = ({ telemetry }) => {
    const modes = [
        { label: "ARMED", active: telemetry.armed },
        { label: "ANGLE", active: telemetry.modes.angle },
        { label: "POS_HOLD", active: telemetry.modes.positionHold },
        { label: "RTH", active: telemetry.modes.returnToHome },
        { label: "ALT_HOLD", active: telemetry.modes.altitudeHold },
        { label: "HDG_HOLD", active: telemetry.modes.headingHold },
        { label: "AIRMODE", active: telemetry.modes.airmode },
        { label: "SURFACE", active: telemetry.modes.surface },
        { label: "BRAKING", active: telemetry.modes.mcBraking },
        { label: "BEEPER", active: telemetry.modes.beeper }
    ];

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Modes Panel */}
            <div className="bg-gcs-panel p-4 rounded-xl border border-main flex-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] font-mono text-dim mb-4">FLIGHT_MODES_</h3>
                <div className="grid grid-cols-2 gap-2">
                    {modes.map(mode => <ModeButton key={mode.label} label={mode.label} active={mode.active} />)}
                </div>
            </div>

            {/* Telemetry Panel */}
            <div className="bg-gcs-panel p-4 rounded-xl border border-main">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] font-mono text-dim mb-4">CORE_TELEMETRY_</h3>
                <div className="space-y-2">
                    <TelemetryItem 
                        label="SIGNAL" 
                        value={`${telemetry.signalStrength} DBM`} 
                        icon={<SignalIcon />} 
                    />
                    <TelemetryItem 
                        label="BATTERY" 
                        value={`${(telemetry.battery.percentage || 0).toFixed(1)}%`} 
                        subValue={`${(telemetry.battery.voltage || 0).toFixed(1)}V`} 
                        icon={<BatteryIcon />} 
                    />
                    <TelemetryItem 
                        label="SATELLITES" 
                        value={telemetry.satellites} 
                        icon={<SatelliteIcon />} 
                    />
                    <TelemetryItem 
                        label="HOME_DIST" 
                        value={`${(telemetry.distanceFromHome || 0).toFixed(0)}M`} 
                        icon={<HomeIcon />} 
                    />
                </div>
            </div>
        </div>
    );
};

export default FlightControls;
