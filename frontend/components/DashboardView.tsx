import React from 'react';
import OverviewCard from './AttitudeIndicator';
import MissionHistory from './MissionHistory';
import PreFlightPanel from './ActionButtons';
import type { OverviewStat, Mission, LiveTelemetry } from '../types';

// SVG Icons for Overview Cards
const DroneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gcs-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5,9A7.5,7.5,0,1,1,12,1.5,7.5,7.5,0,0,1,19.5,9Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9 L12 22.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9 L1.5 9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9 L22.5 9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9 L6.3 3.3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9 L17.7 3.3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9 L6.3 14.7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9 L17.7 14.7" />
    </svg>
);
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gcs-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const BatteryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gcs-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

interface DashboardViewProps {
    overviewStats: Omit<OverviewStat, 'icon'>[];
    missions: Mission[];
    onMissionSetup: () => void;
    telemetry: LiveTelemetry;
    setArmedState: (isArmed: boolean) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ overviewStats: rawStats, missions, onMissionSetup, telemetry, setArmedState }) => {
    const icons: { [key: string]: React.ReactNode } = {
        flights: <DroneIcon />,
        flightTime: <ClockIcon />,
        battery: <BatteryIcon />,
    };
    const overviewStats: OverviewStat[] = rawStats.map(stat => ({ ...stat, icon: icons[stat.id] || <div /> }));

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
                <h2 className="text-lg font-bold text-gcs-text-dark dark:text-white">Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
                    {overviewStats.map(stat => (
                        <OverviewCard key={stat.id} {...stat} />
                    ))}
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
                <div className="lg:col-span-2 min-h-0">
                    <MissionHistory missions={missions} />
                </div>
                <div className="flex flex-col min-h-0">
                    <PreFlightPanel onMissionSetup={onMissionSetup} telemetry={telemetry} setArmedState={setArmedState} />
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
