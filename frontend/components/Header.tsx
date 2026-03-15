import React from 'react';

interface DashboardHeaderProps {
  time: string;
  date: string;
  title: string;
  batteryPercentage: number;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ time, date, title, batteryPercentage }) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mb-8 px-2">
      <div className="relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gcs-primary shadow-[0_0_10px_var(--neon-glow)]" />
        <h1 className="text-3xl font-black text-main uppercase tracking-tighter font-mono italic">
          {title}_
        </h1>
        <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-bold text-dim uppercase tracking-[0.3em] font-mono">SYS_PROTOCOL_ACTIVE</span>
            <div className="h-px w-8 bg-main opacity-10" />
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Tactical Battery Node */}
        <div className="flex items-center gap-3 py-2 px-4 bg-gcs-card/50 border border-main rounded shadow-xl">
            <div className="relative w-5 h-8 border border-dim opacity-50 rounded-sm p-0.5">
                <div 
                    className={`w-full absolute bottom-0 left-0 transition-all duration-1000 ${batteryPercentage > 20 ? 'bg-gcs-success' : 'bg-gcs-error'}`}
                    style={{ height: `${batteryPercentage}%` }}
                />
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-1 bg-dim opacity-50 rounded-t-sm" />
            </div>
            <div>
                <p className="text-[8px] font-black text-dim uppercase tracking-widest font-mono text-right">PWR_LVL</p>
                <p className={`text-sm font-bold font-mono text-right ${batteryPercentage > 20 ? 'text-main' : 'text-gcs-error'}`}>
                    {batteryPercentage.toFixed(1)}%
                </p>
            </div>
        </div>

        {/* Time Node */}
        <div className="text-right border-l border-main pl-8">
            <p className="text-xl font-black text-main tracking-tighter font-mono tabular-nums">{time}</p>
            <p className="text-[9px] font-bold text-gcs-primary uppercase tracking-[0.2em] font-mono">{date}</p>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
