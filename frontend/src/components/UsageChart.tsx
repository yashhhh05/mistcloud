import React from 'react';
import { convertFileSize, calculatePercentage } from '../utils';

interface UsageChartProps {
  used: number;
}

export const UsageChart: React.FC<UsageChartProps> = ({ used = 0 }) => {
  const percentage = calculatePercentage(used);

  return (
    <div className="usage-chart bg-brand/5 border border-brand/20 rounded-[20px] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="space-y-2 text-center md:text-left">
        <h3 className="h3 text-dark-100 font-bold">Storage Usage</h3>
        <p className="body-2 text-light-100">
          You have used <span className="font-semibold text-brand">{convertFileSize(used)}</span> of 2 GB available cloud storage.
        </p>

        {/* Linear progress bar */}
        <div className="w-full md:w-80 h-3 bg-light-300 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative size-24 flex items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-light-300"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-brand transition-all duration-700"
              strokeDasharray={`${percentage}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-dark-100">{percentage}%</span>
            <span className="text-[10px] text-light-200">Used</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageChart;
