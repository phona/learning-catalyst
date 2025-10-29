import React, { useState, useEffect, useCallback } from 'react';
import { SimpleAnalyticsModule, Achievement } from '../../modules/analytics/simple-analytics';

interface AchievementsProps {
  analytics: SimpleAnalyticsModule;
  className?: string;
}

const AchievementsComponent: React.FC<AchievementsProps> = ({ analytics, className = '' }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [analytics]);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const achievementsData = await analytics.getAchievements();
      setAchievements(achievementsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, [analytics]);

  const getAchievementIcon = useCallback((achievement: Achievement) => {
    // If there's a custom icon, use it
    if (achievement.icon) {
      return <span className="text-2xl">{achievement.icon}</span>;
    }

    // Default icons based on category
    const icons = {
      time: '⏰',
      concepts: '🧠',
      streak: '🔥',
      performance: '🎯',
      engagement: '⚡'
    };

    return <span className="text-2xl">{icons[achievement.category] || '🏆'}</span>;
  }, []);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCategoryColor = (category: Achievement['category']) => {
    const colors = {
      time: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      concepts: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      streak: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      performance: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      engagement: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200'
    };

    return colors[category] || colors.time;
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
          <p className="text-sm">Error loading achievements: {error}</p>
        </div>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const lockedAchievements = achievements.filter(a => !a.unlockedAt);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Achievements</h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {unlockedAchievements.length} / {achievements.length} unlocked
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Overall Progress</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedAchievements.length / achievements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
            🏆 Unlocked ({unlockedAchievements.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unlockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div className="flex-shrink-0">
                  {getAchievementIcon(achievement)}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {achievement.title}
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {achievement.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(achievement.category)}`}>
                      {achievement.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {achievement.unlockedAt?.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
            🔒 In Progress ({lockedAchievements.length})
          </h4>
          <div className="space-y-3">
            {lockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-shrink-0 opacity-50">
                  {getAchievementIcon(achievement)}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {achievement.title}
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {achievement.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div
                        className={`${getProgressColor(achievement.progress)} h-1.5 rounded-full transition-all duration-300`}
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p>No achievements available yet</p>
          <p className="text-sm">Start learning to unlock achievements</p>
        </div>
      )}
    </div>
  );
};

export const Achievements = React.memo(AchievementsComponent);