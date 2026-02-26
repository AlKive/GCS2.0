import React from 'react';
import type { OverviewStat } from '../types';

const OverviewCard: React.FC<OverviewStat> = ({ icon, label, value, subtext }) => {
  return (
    <div className="bg-gcs-card dark:bg-gray-800 p-3 rounded-xl shadow-sm flex flex-col">
      <div className="flex items-center mb-2">
        <div className="w-7 h-7 rounded-full bg-gcs-primary/10 flex items-center justify-center">
            {icon}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gcs-text-dark dark:text-white mt-0.5">{value}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{subtext}</p>
      </div>
    </div>
  );
};

export default OverviewCard;