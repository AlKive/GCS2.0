import React from 'react';

interface DashboardHeaderProps {
  time: string;
  date: string;
  title: string;
  batteryPercentage: number;
}

const BatteryStatusIcon: React.FC<{ percentage: number }> = ({ percentage }) => {
    const level = Math.round(percentage / 25); // 0-4
    const color = percentage > 50 ? 'text-green-500' : percentage > 20 ? 'text-yellow-500' : 'text-red-500';

    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700">
            <svg className={`w-6 h-6 ${color}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.75 3.25V2a.75.75 0 00-1.5 0v1.25H9A2.75 2.75 0 006.25 6v10A2.75 2.75 0 009 18.75h2A2.75 2.75 0 0013.75 16V6A2.75 2.75 0 0011 3.25h-.25zM9 4.75h2a1.25 1.25 0 011.25 1.25v10a1.25 1.25 0 01-1.25 1.25H9A1.25 1.25 0 017.75 16V6A1.25 1.25 0 019 4.75z" clipRule="evenodd" />
              {percentage > 10 && <rect x="8" y={15 - ((percentage-10)/90)*9} width="4" height={((percentage-10)/90)*9} rx="0.5" />}
            </svg>
            <span className={`font-semibold text-sm ${color}`}>{percentage.toFixed(1)}%</span>
        </div>
    )
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ time, date, title, batteryPercentage }) => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h1 className="text-2xl font-bold text-gcs-text-dark dark:text-white">{title}</h1>
      </div>
      <div className="text-right">
        <p className="font-semibold text-base dark:text-gray-200">{time}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{date}</p>
      </div>
    </header>
  );
};

export default DashboardHeader;