import React from 'react';

interface ProgressChartProps {
  title: string;
  value: number;
  maxValue?: number;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  value,
  maxValue = 100,
  color = 'blue',
  size = 'medium',
  showLabel = true,
  className = ''
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  const colorClasses = {
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    yellow: 'stroke-yellow-500',
    red: 'stroke-red-500',
    purple: 'stroke-purple-500',
    orange: 'stroke-orange-500'
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl'
  };

  const radius = size === 'small' ? 28 : size === 'medium' ? 42 : 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            strokeWidth="8"
            fill="none"
            className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} transition-all duration-500 ease-out`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${textSizeClasses[size]} font-bold text-gray-900 dark:text-gray-100`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center mt-2">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{value} / {maxValue}</div>
        </div>
      )}
    </div>
  );
};

interface ProgressBarProps {
  title: string;
  value: number;
  maxValue?: number;
  color?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  title,
  value,
  maxValue = 100,
  color = 'blue',
  showPercentage = true,
  className = ''
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        {showPercentage && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(percentage)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};