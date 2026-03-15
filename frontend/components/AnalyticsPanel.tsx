import React, { useMemo } from 'react';
import type { FlightSession } from 'types';

// --- Tactical Chart Components ---
const BarChart: React.FC<{ sessions: FlightSession[] }> = ({ sessions }) => {
    const weeklyData = useMemo(() => {
        const now = new Date();
        const data = [
            { label: 'W_04', value: 0 },
            { label: 'W_03', value: 0 },
            { label: 'W_02', value: 0 },
            { label: 'CURR', value: 0 },
        ];
        
        sessions.forEach(session => {
            const sessionDate = new Date(session.start_time);
            if (isNaN(sessionDate.getTime()) || sessionDate > now) return; 

            const diffTime = now.getTime() - sessionDate.getTime();
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
    }, [sessions]);

    const maxVal = Math.max(...weeklyData.map(d => d.value), 1);

    return (
        <div className="flex h-48 items-end justify-around w-full px-4 bg-gcs-card/30 rounded border border-main py-6">
            {weeklyData.map((bar, i) => (
                <div key={i} className="flex flex-col items-center w-1/6 group">
                    <div className="w-full bg-gcs-dark/50 rounded-t-sm relative flex items-end justify-center transition-all duration-500" style={{ height: '140px' }}>
                        <div 
                           className="w-full bg-gradient-to-t from-gcs-primary to-gcs-primary/40 rounded-t-sm transition-all duration-700 ease-out group-hover:brightness-125 neon-glow"
                           style={{ height: `${(bar.value / maxVal) * 100}%` }}
                        >
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-20 shadow-[0_0_10px_white]" />
                        </div>
                        {bar.value > 0 && (
                            <span className="absolute -top-7 text-[10px] font-mono font-bold text-gcs-primary bg-gcs-panel px-1.5 py-0.5 rounded border border-main">
                                {bar.value.toString().padStart(2, '0')}
                            </span>
                        )}
                    </div>
                    <span className="text-[9px] font-mono font-bold text-dim mt-3 tracking-[0.2em]">{bar.label}</span>
                </div>
            ))}
        </div>
    );
};

const DonutChart: React.FC<{ percentage: number }> = ({ percentage }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="transform -rotate-90 w-48 h-48">
                {/* Background Ring */}
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="2" fill="transparent" className="text-main opacity-5" />
                <circle cx="96" cy="96" r={radius + 8} stroke="currentColor" strokeWidth="1" fill="transparent" className="text-main opacity-5" strokeDasharray="4 4" />
                
                {/* Progress Ring */}
                <circle 
                    cx="96" cy="96" r={radius} 
                    stroke="var(--neon-primary)" strokeWidth="6" fill="transparent" 
                    className="transition-all duration-1000 ease-out" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    strokeLinecap="butt" 
                />
                
                {/* Glow Effect */}
                <circle 
                    cx="96" cy="96" r={radius} 
                    stroke="var(--neon-primary)" strokeWidth="12" fill="transparent" 
                    className="opacity-20 blur-md" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-main tracking-tighter font-mono">{percentage.toFixed(0)}<span className="text-sm text-gcs-primary ml-0.5">%</span></span>
                <span className="text-[8px] font-mono text-dim uppercase tracking-[0.3em] mt-1 font-bold">EFFICACY_RT</span>
            </div>
        </div>
    );
};


interface AnalyticsPanelProps {
  sessions: FlightSession[];
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ sessions }) => {

  const { totalFlights, totalDetections, totalSprays, activeTimeStr } = useMemo(() => {
      let flights = sessions.length;
      let detections = 0;
      let sprays = 0;
      let totalSeconds = 0;

      sessions.forEach(s => {
          if (s.target_detections) detections += s.target_detections.length;
          if (s.spray_logs) sprays += s.spray_logs.length;
          
          if (s.end_time) {
              const diff = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
              if (diff > 0) totalSeconds += diff / 1000;
          }
      });

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return {
          totalFlights: flights,
          totalDetections: detections,
          totalSprays: sprays,
          activeTimeStr: `${hours}H ${minutes}M`
      };
  }, [sessions]);

  const sprayRate = totalDetections > 0 ? (totalSprays / totalDetections) * 100 : 0;

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
            <div>
                <h2 className="text-2xl font-black text-main uppercase tracking-[0.2em] font-mono italic">ANALYTICS_CORE_</h2>
                <div className="h-[2px] w-16 bg-gcs-primary mt-1 neon-glow" />
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-mono text-dim uppercase tracking-widest font-bold">GLOBAL_DATA_SYNC</span>
                    <span className="text-[10px] font-mono text-gcs-success">STATUS: SYNCHRONIZED</span>
                </div>
                <div className="w-10 h-10 bg-gcs-card/50 border border-main rounded flex items-center justify-center text-gcs-primary neon-glow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                </div>
            </div>
        </div>

        {/* Tactical Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard title="Sortie Count" value={totalFlights.toString()} label="TOTAL_DEPLOYMENTS" icon={<ActivityIcon />} />
            <StatCard title="AI Identification" value={totalDetections.toString()} label="POSITIVE_TARGETS" icon={<TargetIcon />} />
            <StatCard title="Neutralization" value={totalSprays.toString()} label="SPRAY_INTERVENTIONS" icon={<DropletIcon />} />
            <StatCard title="Active Uptime" value={activeTimeStr} label="TOTAL_FLIGHT_TIME" icon={<ClockIcon />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
            {/* Weekly Activity HUD */}
            <div className="xl:col-span-2 bg-gcs-panel border border-main rounded-lg p-6 flex flex-col shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xs font-black text-main uppercase tracking-[0.2em] font-mono opacity-60">TEMPORAL_ANALYSIS_V4</h3>
                        <p className="text-[9px] text-dim font-mono uppercase">Activity_Frequency_7D</p>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(4)].map((_, i) => <div key={i} className="w-1 h-1 bg-gcs-primary shadow-[0_0_5px_var(--neon-glow)] rounded-full" />)}
                    </div>
                </div>
                <div className="flex-1 flex items-center">
                    <BarChart sessions={sessions} />
                </div>
            </div>

            {/* Spray Rate HUD */}
            <div className="bg-gcs-panel border border-main rounded-lg p-6 flex flex-col items-center shadow-2xl relative overflow-hidden">
                 <div className="w-full text-left mb-4 relative z-10 border-b border-main pb-4">
                    <h3 className="text-xs font-black text-main uppercase tracking-[0.2em] font-mono opacity-60">NEUTRALIZATION_RT</h3>
                    <p className="text-[9px] text-dim font-mono uppercase">Mission_Success_Efficacy</p>
                 </div>
                 
                 <div className="flex-grow flex items-center justify-center py-4 relative z-10">
                     <DonutChart percentage={sprayRate} />
                 </div>

                 <div className="w-full mt-auto p-4 bg-gcs-card/50 border border-main rounded relative z-10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-mono font-bold text-dim uppercase tracking-widest">UNIT_PERFORMANCE</span>
                        <span className="text-[10px] font-mono font-black text-gcs-primary">{totalSprays}/{totalDetections}</span>
                    </div>
                    <div className="h-1 w-full bg-main rounded-full overflow-hidden">
                        <div className="h-full bg-gcs-primary neon-glow shadow-[0_0_10px_var(--neon-glow)]" style={{ width: `${sprayRate}%` }} />
                    </div>
                 </div>

                 {/* Subtle BG Pattern */}
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gcs-primary/5 blur-[60px] -mr-16 -mt-16" />
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

const StatCard: React.FC<{ title: string, value: string, label: string, icon: React.ReactNode }> = ({ title, value, label, icon }) => (
    <div className="bg-gcs-panel border border-main p-5 rounded flex items-center gap-5 group hover:border-gcs-primary/30 transition-all duration-300 relative overflow-hidden shadow-xl">
        <div className="p-3 bg-gcs-card text-gcs-primary rounded border border-main group-hover:scale-110 transition-transform duration-500 neon-glow">
            {icon}
        </div>
        <div className="flex-1">
            <p className="text-[9px] font-mono font-bold text-dim uppercase tracking-widest mb-0.5">{title}</p>
            <p className="text-2xl font-black text-main tracking-tight font-mono truncate">{value}</p>
            <p className="text-[8px] font-mono text-dim uppercase tracking-tighter mt-1 font-bold">{label}</p>
        </div>
        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
            <span className="text-4xl font-black text-main italic">#</span>
        </div>
    </div>
);

const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const DropletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

export default AnalyticsPanel;
