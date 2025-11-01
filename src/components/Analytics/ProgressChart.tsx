import React, { useState, useEffect } from 'react';

interface ProgressChartProps {
  title: string;
  value: number;
  maxValue?: number;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
  animated?: boolean;
  showSparkles?: boolean;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  value,
  maxValue = 100,
  color = 'blue',
  size = 'medium',
  showLabel = true,
  className = '',
  animated = true,
  showSparkles = false
}) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const percentage = Math.min((value / maxValue) * 100, 100);

  const sizeClasses = {
    small: 'w-20 h-20',
    medium: 'w-28 h-28',
    large: 'w-36 h-36'
  };

  const gradientColors = {
    blue: ['from-blue-400', 'to-blue-600', 'stroke-blue-500'],
    green: ['from-emerald-400', 'to-emerald-600', 'stroke-emerald-500'],
    yellow: ['from-amber-400', 'to-amber-600', 'stroke-amber-500'],
    red: ['from-red-400', 'to-red-600', 'stroke-red-500'],
    purple: ['from-purple-400', 'to-purple-600', 'stroke-purple-500'],
    orange: ['from-orange-400', 'to-orange-600', 'stroke-orange-500'],
    primary: ['from-primary-400', 'to-primary-600', 'stroke-primary-500']
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl'
  };

  const radius = size === 'small' ? 32 : size === 'medium' ? 44 : 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;
  const [gradientId] = useState(`gradient-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayPercentage(percentage);
        if (percentage >= 100) {
          setIsComplete(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayPercentage(percentage);
      setIsComplete(percentage >= 100);
    }
  }, [percentage, animated]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Simple glow effect */}
        {displayPercentage > 0 && (
          <div className={`absolute inset-0 rounded-full ${gradientColors[color as keyof typeof gradientColors]?.[0] || gradientColors.primary[0]} ${gradientColors[color as keyof typeof gradientColors]?.[1] || gradientColors.primary[1]} opacity-10 blur-lg`}></div>
        )}

        <svg className="relative transform -rotate-90 w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" className="text-opacity-80" />
              <stop offset="100%" stopColor="currentColor" />
            </linearGradient>
          </defs>

          {/* Background circle with gradient */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="url(#bg-gradient)"
            strokeWidth="12"
            fill="none"
            className="opacity-20"
          />
          <defs>
            <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" className="text-gray-300 dark:text-gray-600" />
              <stop offset="100%" stopColor="currentColor" className="text-gray-200 dark:text-gray-700" />
            </linearGradient>
          </defs>

          {/* Progress circle with animation */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            strokeWidth="12"
            fill="none"
            className={`transition-all duration-1000 ease-out ${gradientColors[color as keyof typeof gradientColors]?.[2] || gradientColors.primary[2]}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset
            }}
            strokeLinecap="round"
            stroke="url(#gradient)"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`${textSizeClasses[size]} font-bold ${gradientColors[color as keyof typeof gradientColors]?.[2] || gradientColors.primary[2]}`}>
            {Math.round(displayPercentage)}%
          </div>

          {/* Completion indicator */}
          {isComplete && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"></div>
          )}

          </div>

        </div>

      {showLabel && (
        <div className="text-center mt-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span className="font-medium">{value}</span>
            <span className="mx-1 opacity-50">/</span>
            <span>{maxValue}</span>
          </div>

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
  animated?: boolean;
  showGlow?: boolean;
  height?: 'small' | 'medium' | 'large';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  title,
  value,
  maxValue = 100,
  color = 'blue',
  showPercentage = true,
  className = '',
  animated = true,
  showGlow = false,
  height = 'medium'
}) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const percentage = Math.min((value / maxValue) * 100, 100);

  const gradientColors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    yellow: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    primary: 'from-primary-500 to-primary-600'
  };

  const heightClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4'
  };

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayPercentage(percentage);
        setIsComplete(percentage >= 100);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayPercentage(percentage);
      setIsComplete(percentage >= 100);
    }
  }, [percentage, animated]);

  return (
    <div className={`group ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
            {title}
          </span>
          {isComplete && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          )}
        </div>
        {showPercentage && (
          <span className={`text-sm font-medium transition-all duration-300 ${
            isComplete
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-primary-600 dark:text-primary-400'
          }`}>
            {Math.round(displayPercentage)}%
          </span>
        )}
      </div>

      <div className={`relative w-full bg-gray-200 dark:bg-gray-700 rounded-full ${heightClasses[height]} overflow-hidden`}>
        {/* Progress bar with simple styling */}
        <div
          className={`h-full bg-gradient-to-r ${gradientColors[color as keyof typeof gradientColors] || gradientColors.primary} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${displayPercentage}%` }}
        >
        </div>
      </div>
    </div>
  );
};