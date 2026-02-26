import React, { useMemo } from 'react';
import type { Mission } from 'types';

// --- Reusable Chart Components ---

const BarChart: React.FC<{ missions: Mission[] }> = ({ missions }) => {
    const weeklyData = useMemo(() => {
        const now = new Date();
        const data = [
            { label: '3 Wks Ago', value: 0 },
            { label: '2 Wks Ago', value: 0 },
            { label: 'Last Wk', value: 0 },
            { label: 'This Wk', value: 0 },
        ];
        
        missions.forEach(mission => {
            const missionDate = new Date(mission.date);
            if (isNaN(missionDate.getTime())) return; 

            if (missionDate > now) return; 
            const diffTime = now.getTime() - missionDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < 7) {
                data[3].value++;
            } else if (diffDays >= 7 && diffDays < 14) {
                data[2].value++;
            } else if (diffDays >= 14 && diffDays < 21) {
                data[1].value++;
            } else if (diffDays >= 21 && diffDays < 28) {
                data[0].value++;
            }
        });

        return data;
    }, [missions]);

    const maxValue = Math.max(...weeklyData.map(d => d.value), 1) * 1.2;

    if (missions.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-3 text-gray-500 text-sm">
                No mission data to display.
            </div>
        )
    }

    return (
        <div className="h-full flex items-end justify-around gap-3 px-4 pb-3 pt-6">
            {weeklyData.map(item => (
                <div key={item.label} className="flex-1 flex flex-col items-center">
                    <div className="relative w-full h-full flex items-end">
                       <div className="w-full bg-gcs-primary/20 rounded-t-md hover:bg-gcs-primary/40 transition-colors" style={{ height: `${(item.value / maxValue) * 100}%` }}>
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-gcs-text-dark dark:text-white">{item.value}</span>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

// ---
// FIX #7: This function now reads a string of total seconds (e.g., "45")
// and converts it to minutes.
// ---
const parseDuration = (duration: string | null | undefined): number => {
  if (!duration) return 0;

  try {
    // 'duration' is now a string like "45" (total seconds)
    const totalSeconds = parseInt(duration, 10);
    if (isNaN(totalSeconds)) return 0;
    
    // Convert seconds to minutes for the chart
    return totalSeconds / 60; 
  } catch (e) {
    return 0;
  }
};
// --- END OF FIX ---


const LineChart: React.FC<{ missions: Mission[] }> = ({ missions }) => {
    const data = useMemo(() => {
        return missions
            .slice(0, 10)
            .reverse()
            .map(m => parseDuration(m.duration)); // This now uses the safe function
    }, [missions]);
    
    if (data.length < 2) {
        return (
            <div className="h-full flex items-center justify-center p-3 text-gray-500 text-sm">
                Not enough mission data to display trend.
            </div>
        )
    }

    const width = 300;
    const height = 150;
    const maxValue = Math.max(...data, 1) * 1.1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d / maxValue) * height}`).join(' ');

    return (
        <div className="h-full flex items-center justify-center p-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                <polyline fill="none" stroke="#F97316" strokeWidth="2.5" points={points} />
                {data.map((d, i) => (
                    <circle key={i} cx={(i / (data.length - 1)) * width} cy={height - (d / maxValue) * height} r="3" fill="#F97316" className="opacity-50 hover:opacity-100" />
                ))}
            </svg>
        </div>
    );
};


const DonutChart: React.FC<{ percentage: number }> = ({ percentage }) => {
    const size = 100;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    return (
        <div className="relative flex items-center justify-center" style={{width: size, height: size}}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle className="text-gray-200 dark:text-gray-600" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size/2} cy={size/2} />
                <circle className="text-gcs-primary"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size/2}
                    cy={size/2}
                    style={{transform: 'rotate(-90deg)', transformOrigin: '50% 50%'}}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                 <span className="text-xl font-bold dark:text-white">{percentage}%</span>
                 <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
            </div>
        </div>
    );
};


// --- Main Analytics Panel ---

interface AnalyticsPanelProps {
    missions: Mission[];
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ missions }) => {
    const totalMissions = missions.length;
    const completedMissions = missions.filter(m => m.status === 'Completed').length;
    const successRate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-full animate-fade-in">
            {/* Summary Cards */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm"><p className="text-xs text-gray-500 dark:text-gray-400">Missions Flown</p><p className="text-2xl font-bold mt-1 dark:text-white">{totalMissions}</p><p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Total Missions Completed</p></div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm"><p className="text-xs text-gray-500 dark:text-gray-400">Coverage Area</p><p className="text-2xl font-bold mt-1 dark:text-white">1,255 <span className="text-lg">ha</span></p><p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Total Area Treated</p></div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm"><p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p><p className="text-2xl font-bold mt-1 dark:text-white">{successRate}%</p><p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Completed Mission Ratio</p></div>

            {/* Charts */}
            <div className="md:col-span-1 lg:col-span-2 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex flex-col">
                <h3 className="font-bold text-base dark:text-white mb-2">Missions Over Time (Last 4 Weeks)</h3>
                <div className="flex-1 min-h-0">
                    <BarChart missions={missions} />
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex flex-col">
                 <h3 className="font-bold text-base dark:text-white mb-2">Flight Duration Trend (Last 10)</h3>
                 <div className="flex-1 min-h-0">
                      <LineChart missions={missions} />
                 </div>
            </div>

            {/* Data Cards */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex flex-col">
                <h3 className="font-bold text-base mb-2 dark:text-white">Operational & Efficiency</h3>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 flex-grow">
                    <p>Area Covered: <span className="font-semibolsd float-right dark:text-gray-100">1,550 Hectares</span></p>
                    <p>Spray Efficiency: <span className="font-semibold float-right text-green-600">92%</span></p>
                    <p>Chemical: <span className="font-semibold float-right dark:text-gray-100">15.4 Liters / Mission</span></p>
                    <hr className="my-1.5 dark:border-gray-700"/>
                    <p>Mosquito Reduction: <span className="font-bold float-right text-red-500">28% (Reduction)</span></p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex flex-col">
                 <h3 className="font-bold text-base mb-2 dark:text-white">Environmental Data</h3>
                 <div className="flex-grow bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center rounded-lg min-h-[80px]">
                     <p className="text-gray-500 dark:text-gray-400 text-xs">(Environmental Chart)</p>
                 </div>
                 <p className="text-center text-xs mt-2 text-gray-600 dark:text-gray-400">Avg Temp: 28°C / Humidity 75%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex flex-col items-center">
                 <h3 className="font-bold text-base mb-2 dark:text-white">Mission Performance Summary</h3>
                 <div className="flex-grow flex items-center justify-center">
                     <DonutChart percentage={successRate} />
                 </div>
                 <button className="w-full mt-3 bg-gcs-primary text-white font-bold text-sm py-2 px-4 rounded-lg hover:opacity-90 transition-opacity">
                   Export Report
                 </button>
            </div>

        </div>
    );
};

export default AnalyticsPanel;