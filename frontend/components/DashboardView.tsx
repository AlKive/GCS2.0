import React from 'react';
import OverviewCard from './AttitudeIndicator';
import MissionHistory from './MissionHistory';
import PreFlightPanel from './ActionButtons';
import type { OverviewStat, FlightSession, LiveTelemetry } from '../types';

// --- Tactical SVG Icons with Dynamic Neon Glow ---
const DroneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gcs-primary neon-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gcs-primary neon-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const BatteryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gcs-primary neon-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

interface DashboardViewProps {
    overviewStats: Omit<OverviewStat, 'icon'>[];
    sessions: FlightSession[];
    onMissionSetup: () => void;
    telemetry: LiveTelemetry;
    setArmedState: (isArmed: boolean) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ overviewStats: rawStats, sessions, onMissionSetup, telemetry, setArmedState }) => {
    const icons: { [key: string]: React.ReactNode } = {
        flights: <DroneIcon />,
        flightTime: <ClockIcon />,
        battery: <BatteryIcon />,
    };
    const overviewStats: OverviewStat[] = rawStats.map(stat => ({ ...stat, icon: icons[stat.id] || <div /> }));

    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in">
            {/* Top Row: Tactical Metrics */}
            <div className="flex-shrink-0">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div>
                        <h2 className="text-xl font-black text-main uppercase tracking-[0.2em] font-mono italic">SYSTEM_OVERVIEW_</h2>
                        <div className="h-[2px] w-12 bg-gcs-primary mt-1 neon-glow" />
                    </div>
                    <div className="text-[10px] font-mono text-dim uppercase tracking-widest bg-gcs-card/50 px-3 py-1 rounded border border-main">
                        OP_STATUS: <span className="text-gcs-success">NOMINAL</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {overviewStats.map(stat => (
                        <OverviewCard key={stat.id} {...stat} />
                    ))}
                </div>
            </div>

            {/* Bottom Row: HUD Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pb-2">
                <div className="lg:col-span-2 min-h-0">
                    <MissionHistory sessions={sessions} />
                </div>
                <div className="flex flex-col min-h-0">
                    <PreFlightPanel onMissionSetup={onMissionSetup} telemetry={telemetry} setArmedState={setArmedState} />
                </div>
            </div>

            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default DashboardView;
