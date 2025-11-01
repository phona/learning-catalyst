import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SimpleAnalyticsModule, LearningTrends as LearningTrendsType } from '../../modules/analytics/simple-analytics';

interface LearningTrendsProps {
  analytics: SimpleAnalyticsModule;
  className?: string;
}


const LearningTrendsComponent: React.FC<LearningTrendsProps> = ({ analytics, className = '' }) => {
  const [trends, setTrends] = useState<LearningTrendsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    loadTrends();
  }, [analytics, selectedPeriod]);

  const loadTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const trendsData = await analytics.getLearningTrends(selectedPeriod);
      setTrends(trendsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning trends');
    } finally {
      setLoading(false);
    }
  }, [analytics, selectedPeriod]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getAverageStudyTime = useMemo(() => {
    if (!trends?.dailyStudyTime.length) return 0;
    const total = trends.dailyStudyTime.reduce((sum, day) => sum + day.minutes, 0);
    return Math.round(total / trends.dailyStudyTime.length);
  }, [trends]);

  const getTrendDirection = (data: number[]): 'up' | 'down' | 'stable' => {
    if (data.length < 2) return 'stable';
    const recent = data.slice(-3).reduce((sum, val) => sum + val, 0) / Math.min(3, data.length);
    const earlier = data.slice(0, 3).reduce((sum, val) => sum + val, 0) / Math.min(3, data.length);

    if (recent > earlier * 1.1) return 'up';
    if (recent < earlier * 0.9) return 'down';
    return 'stable';
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center text-red-600 dark:text-red-400">
          <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Error loading trends: {error}</p>
        </div>
      </div>
    );
  }

  if (!trends) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>No trend data available</p>
        </div>
      </div>
    );
  }

  const studyTimeTrend = getTrendDirection(trends.dailyStudyTime.map(d => d.minutes));
  const masteryTrend = getTrendDirection(trends.masteryProgress.map(d => d.avgMastery));

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Learning Trends</h3>
        <div className="flex gap-2">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days as 7 | 14 | 30)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Avg Daily Study</div>
              <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                {formatTime(getAverageStudyTime)}
              </div>
            </div>
            {getTrendIcon(studyTimeTrend)}
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-600 dark:text-green-400 mb-1">Mastery Trend</div>
              <div className="text-xl font-bold text-green-900 dark:text-green-100">
                {trends.masteryProgress.length > 0
                  ? Math.round(trends.masteryProgress[trends.masteryProgress.length - 1].avgMastery * 100) / 100
                  : 0}
              </div>
            </div>
            {getTrendIcon(masteryTrend)}
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Total Sessions</div>
              <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
                {Object.values(trends.sessionTypes).reduce((sum, count) => sum + count, 0)}
              </div>
            </div>
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Session Types Breakdown */}
      {trends.sessionTypes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Session Types</h4>
          <div className="space-y-2">
            {trends.sessionTypes.map((sessionType) => (
              <div key={sessionType.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {sessionType.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{sessionType.count} sessions</span>
                  <span>{Math.round(sessionType.avgDuration)}m avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {trends.dailyStudyTime.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">Recent Activity</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {trends.dailyStudyTime.slice(-7).reverse().map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {formatTime(day.minutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const LearningTrends = React.memo(LearningTrendsComponent);