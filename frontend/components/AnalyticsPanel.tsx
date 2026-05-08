import React, { useMemo, useState } from 'react';
import type { FlightSession } from 'types';

// --- Temporal Analysis HUD ---
const TemporalAnalysisHUD: React.FC<{ sessions: FlightSession[] }> = ({ sessions }) => {
    const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    const chartData = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (timeframe === 'daily') {
            /** * Modified: Range starts from 5 days ago to hide May 02 
             * and focus on May 03 onwards.
             */
            const data = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now);
                const daysAgo = 5 - i; // i=0 is 5 days ago (May 03), i=5 is TODAY
                d.setDate(now.getDate() - daysAgo);
                
                const formattedDate = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                
                return {
                    label: daysAgo === 0 ? 'TODAY' : formattedDate,
                    value: 0
                };
            });

            sessions.forEach(session => {
                const sessionDate = new Date(session.start_time);
                if (isNaN(sessionDate.getTime()) || sessionDate > now) return;
                
                const dDate = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
                const diffTime = today.getTime() - dDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                // Only count sessions from May 03 (diffDays < 6)
                if (diffDays >= 0 && diffDays < 6) {
                    data[5 - diffDays].value++;
                }
            });
            return data;
        }

        // ... weekly and monthly logic remains unchanged
        if (timeframe === 'weekly') {
            const data = [
                { label: 'W_03', value: 0 },
                { label: 'W_02', value: 0 },
                { label: 'W_01', value: 0 },
                { label: 'CURR', value: 0 },
            ];
            sessions.forEach(session => {
                const sessionDate = new Date(session.start_time);
                if (isNaN(sessionDate.getTime()) || sessionDate > now) return; 
                const diffTime = now.getTime() - sessionDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays < 7) data[3].value++;
                else if (diffDays >= 7 && diffDays < 14) data[2].value++;
                else if (diffDays >= 14 && diffDays < 21) data[1].value++;
                else if (diffDays >= 21 && diffDays < 28) data[0].value++;
            });
            return data;
        }

        if (timeframe === 'monthly') {
            const data = Array.from({ length: 6 }, (_, i) => ({
                label: i === 0 ? 'CURR' : `M_0${i}`,
                value: 0
            })).reverse();
            sessions.forEach(session => {
                const sessionDate = new Date(session.start_time);
                if (isNaN(sessionDate.getTime()) || sessionDate > now) return; 
                const monthsAgo = (now.getFullYear() - sessionDate.getFullYear()) * 12 + now.getMonth() - sessionDate.getMonth();
                if (monthsAgo >= 0 && monthsAgo < 6) data[5 - monthsAgo].value++;
            });
            return data;
        }
        return [];
    }, [sessions, timeframe]);

    // This maxVal calculation automatically adjusts the bar heights to the new highest day
    const maxVal = Math.max(...chartData.map(d => d.value), 1);

    return (
        <div className="xl:col-span-3 bg-gcs-panel border border-main rounded-lg p-6 flex flex-col shadow-2xl relative overflow-hidden">
            {/* ... rest of the component remains the same */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xs font-black text-main uppercase tracking-[0.2em] font-mono opacity-60">TEMPORAL_ANALYSIS_V4</h3>
                    <p className="text-[9px] text-dim font-mono uppercase">Activity_Frequency_Trending</p>
                </div>
                <div className="flex gap-2 relative z-10">
                    {(['daily', 'weekly', 'monthly'] as const).map(tf => (
                        <button 
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`text-[9px] font-mono uppercase px-3 py-1 rounded transition-all duration-300 ${
                                timeframe === tf 
                                ? 'bg-gcs-primary/10 border border-gcs-primary text-gcs-primary shadow-[0_0_10px_var(--neon-glow)]' 
                                : 'border border-main text-dim hover:text-main hover:border-main/80 bg-gcs-card/30'
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex items-center">
                <div className="flex h-48 items-end justify-around w-full px-4 bg-gcs-card/30 rounded border border-main py-6">
                    {chartData.map((bar, i) => (
                        <div key={i} className="flex flex-col items-center flex-1 group">
                            <div className="w-full max-w-[48px] bg-gcs-dark/50 rounded-t-sm relative flex items-end justify-center transition-all duration-500" style={{ height: '140px' }}>
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
            </div>
        </div>
    );
};

// --- Other Tactical Components ---
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

// --- Main Panel Component ---
interface AnalyticsPanelProps {
  sessions: FlightSession[];
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ sessions }) => {

  const { 
      totalFlights,
      completedFlights, 
      totalDetections, 
      totalSprays, 
      manualSprays,
      streamRuntimeStr,
      totalAreaTreated
  } = useMemo(() => {
      let flights = sessions.length; // All records from Supabase
      let completed = 0;
      let detections = 0;
      let sprays = 0;
      let manualSpraysCount = 0;
      let areaSum = 0;
      let totalStreamSeconds = 0;

      sessions.forEach(s => {
          // Count completed sorties
          if (s.status === 'completed') completed++;

          if (s.detections) detections += s.detections.length;
          
          if (s.spray_operations) {
              sprays += s.spray_operations.length;
              s.spray_operations.forEach(op => {
                  if (op.trigger_type === 'Manual') manualSpraysCount++;
                  
                  // This explicitly pulls the true computed surface area from the database
                  if (op.true_area_scaled) areaSum += op.true_area_scaled;
              });
          }
          
          // Reverted back to Session Start & End Time for Stream Runtime
          if (s.start_time && s.end_time) {
              const diff = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
              if (diff > 0) totalStreamSeconds += diff / 1000;
          }
      });

      const hours = Math.floor(totalStreamSeconds / 3600);
      const minutes = Math.floor((totalStreamSeconds % 3600) / 60);

      return {
          totalFlights: flights,
          completedFlights: completed,
          totalDetections: detections,
          totalSprays: sprays,
          manualSprays: manualSpraysCount,
          streamRuntimeStr: `${hours}H ${minutes}M`,
          totalAreaTreated: areaSum.toFixed(2)
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

        {/* Completed Sortie Grid */}
        <div className="grid grid-cols-1 gap-4">
             <div className="bg-gcs-panel border border-main p-1 rounded relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gcs-success shadow-[0_0_10px_var(--neon-success)]" />
                <div className="flex items-center justify-between px-6 py-4">
                    <div>
                        <h3 className="text-xs font-black text-main uppercase tracking-[0.2em] font-mono opacity-60">COMPLETED_SORTIE_LOGS</h3>
                        <p className="text-[9px] text-dim font-mono uppercase">Verified_Mission_Success</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-3xl font-black text-gcs-success font-mono tracking-tighter">{completedFlights.toString().padStart(2, '0')}</p>
                            <p className="text-[8px] font-mono text-dim uppercase tracking-widest font-bold">SUCCESSFUL</p>
                        </div>
                        <div className="h-10 w-[1px] bg-main opacity-20" />
                        <div className="text-center">
                            <p className="text-3xl font-black text-main font-mono tracking-tighter">{totalFlights.toString().padStart(2, '0')}</p>
                            <p className="text-[8px] font-mono text-dim uppercase tracking-widest font-bold">TOTAL_DATABASE</p>
                        </div>
                    </div>
                </div>
             </div>
        </div>

        {/* Tactical Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard 
                title="Sortie Count" 
                value={totalFlights.toString()} 
                label="TOTAL_DEPLOYMENTS" 
                icon={<ActivityIcon />} 
                tooltip="The total sum of all flight sessions initialized and logged in the database."
            />
            <StatCard 
                title="AI Identification" 
                value={totalDetections.toString()} 
                label="POSITIVE_TARGETS" 
                icon={<TargetIcon />} 
                tooltip="The total count of confirmed positive target detections verified by the onboard AI vision system."
            />
            <StatCard 
                title="Neutralization" 
                value={totalSprays.toString()} 
                label="TOTAL_TREATMENTS" 
                icon={<DropletIcon />} 
                tooltip="The total number of spray operations (both manual and automatic) executed to neutralize identified targets."
            />
            <StatCard 
                title="Stream Runtime" 
                value={streamRuntimeStr} 
                label="TOTAL_SESSION_TIME" 
                icon={<ClockIcon />} 
                tooltip="The accumulated duration of all flight sessions, calculated by subtracting the start time from the end time of every database record."
            />
            <StatCard 
                title="Area Treated" 
                value={totalAreaTreated} 
                label="SCALED_UNITS_SQ" 
                icon={<AreaIcon />} 
                tooltip="The sum of the physical surface area treated. This is computed in real-time by the AI Engine scaling pixel dimensions against the LiDAR altitude data."
            />
        </div>

        {/* Deep Analytics HUDs */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0">
            {/* Temporal Analysis Component */}
            <TemporalAnalysisHUD sessions={sessions} />

            {/* Spray Rate HUD */}
            <div className="xl:col-span-1 bg-gcs-panel border border-main rounded-lg p-6 flex flex-col items-center shadow-2xl relative overflow-hidden">
                 <div className="w-full flex justify-between items-start mb-4 relative z-10 border-b border-main pb-4">
                    <div>
                        <h3 className="text-xs font-black text-main uppercase tracking-[0.2em] font-mono opacity-60">NEUTRALIZATION_RT</h3>
                        <p className="text-[9px] text-dim font-mono uppercase">Mission_Success_Efficacy</p>
                    </div>
                    
                    {/* Tooltip for Efficacy Rate */}
                    <div className="group/tooltip relative">
                        <div className="w-4 h-4 rounded-full border border-dim text-dim flex items-center justify-center text-[9px] font-bold cursor-help hover:text-gcs-primary hover:border-gcs-primary transition-colors bg-gcs-card">
                            ?
                        </div>
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gcs-dark border border-main rounded shadow-2xl text-[9px] text-slate-300 font-mono leading-relaxed opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-30 pointer-events-none">
                            Efficacy Rate is calculated by dividing the total number of neutralized targets (sprays) by the total number of unique AI-identified targets (detections).
                            <div className="absolute top-full right-1.5 -mt-[1px] w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-main border-r-[6px] border-r-transparent" />
                        </div>
                    </div>
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

                 <div className="absolute top-0 right-0 w-32 h-32 bg-gcs-primary/5 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
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

const StatCard: React.FC<{ title: string, value: string, label: string, icon: React.ReactNode, tooltip: string }> = ({ title, value, label, icon, tooltip }) => (
    <div className="bg-gcs-panel border border-main p-5 rounded flex items-center gap-5 group hover:border-gcs-primary/30 transition-all duration-300 relative shadow-xl">
        {/* Tooltip Icon & Container */}
        <div className="absolute top-2 right-2 group/tooltip z-20">
            <div className="w-4 h-4 rounded-full border border-dim text-dim flex items-center justify-center text-[9px] font-bold cursor-help hover:text-gcs-primary hover:border-gcs-primary transition-colors bg-gcs-card">
                ?
            </div>
            {/* Tooltip Content Box */}
            <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gcs-dark border border-main rounded shadow-2xl text-[9px] text-slate-300 font-mono leading-relaxed opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-30 pointer-events-none">
                {tooltip}
                <div className="absolute top-full right-1.5 -mt-[1px] w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-main border-r-[6px] border-r-transparent" />
            </div>
        </div>

        <div className="p-3 bg-gcs-card text-gcs-primary rounded border border-main group-hover:scale-110 transition-transform duration-500 neon-glow relative z-10">
            {icon}
        </div>
        
        <div className="flex-1 min-w-0 pr-4 relative z-10">
            <p className="text-[9px] font-mono font-bold text-dim uppercase tracking-widest mb-0.5 truncate">{title}</p>
            <p className="text-2xl font-black text-main tracking-tight font-mono truncate">{value}</p>
            <p className="text-[8px] font-mono text-dim uppercase tracking-tighter mt-1 font-bold truncate">{label}</p>
        </div>

        {/* Decorative background overflow container */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded">
            <div className="absolute top-0 right-0 p-2 opacity-5">
                <span className="text-4xl font-black text-main italic">#</span>
            </div>
        </div>
    </div>
);

// --- SVG Icons ---
const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const DropletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AreaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM12 8v8m-4-4h8"/></svg>;

export default AnalyticsPanel;