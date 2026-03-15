import React from 'react';

interface OverviewCardProps {
  id: string;
  label: string;
  value: string;
  subtext: string;
  icon?: React.ReactNode;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ label, value, subtext, icon }) => {
  return (
    <div className="bg-gcs-panel border border-main p-5 rounded-lg shadow-2xl relative overflow-hidden group transition-all duration-300 hover:border-gcs-primary/50">
      {/* Decorative Grid Accent */}
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full text-gcs-primary fill-current">
          <path d="M 100 0 L 100 100 L 0 0 Z" />
        </svg>
      </div>

      <div className="flex items-start gap-4">
        <div className="p-3 bg-gcs-card border border-main rounded text-gcs-primary neon-glow group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono font-bold text-dim uppercase tracking-widest mb-1 truncate">
            {label}_DATA
          </p>
          <h3 className="text-2xl font-black text-main tracking-tight font-mono truncate">
            {value}
          </h3>
          <div className="flex items-center gap-2 mt-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-gcs-primary animate-pulse" />
            <p className="text-[9px] text-dim font-mono uppercase tracking-wider">
              {subtext}
            </p>
          </div>
        </div>
      </div>
      
      {/* Bottom Technical Line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-main to-transparent" />
    </div>
  );
};

export default OverviewCard;
