import React, { useState, useEffect, useCallback } from 'react';
import {
  TrophyIcon,
  LockClosedIcon,
  SparklesIcon,
  FireIcon,
  ClockIcon,
  AcademicCapIcon,
  StarIcon,
  BoltIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { SimpleAnalyticsModule, Achievement } from '../../modules/analytics/simple-analytics';

interface AchievementsProps {
  analytics: SimpleAnalyticsModule;
  className?: string;
}

const AchievementsComponent: React.FC<AchievementsProps> = ({ analytics, className = '' }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);

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

  const getAchievementIcon = useCallback((achievement: Achievement, size: 'small' | 'medium' | 'large' = 'medium') => {
    const sizeClasses = {
      small: 'w-4 h-4',
      medium: 'w-6 h-6',
      large: 'w-8 h-8'
    };

    const iconColors = {
      time: 'text-blue-500',
      concepts: 'text-purple-500',
      streak: 'text-orange-500',
      performance: 'text-green-500',
      engagement: 'text-pink-500'
    };

    const iconComponent = {
      time: <ClockIcon className={sizeClasses[size]} />,
      concepts: <AcademicCapIcon className={sizeClasses[size]} />,
      streak: <FireIcon className={sizeClasses[size]} />,
      performance: <StarIcon className={sizeClasses[size]} />,
      engagement: <BoltIcon className={sizeClasses[size]} />
    };

    const color = achievement.unlockedAt ? iconColors[achievement.category] : 'text-gray-400';

    return (
      <div className={`${color} ${achievement.unlockedAt ? 'animate-pulse-soft' : 'opacity-50'}`}>
        {achievement.icon ? (
          <span className={`${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-3xl'}`}>
            {achievement.icon}
          </span>
        ) : (
          iconComponent[achievement.category] || <TrophyIcon className={sizeClasses[size]} />
        )}
      </div>
    );
  }, []);

  const getProgressGradient = (progress: number) => {
    if (progress >= 100) return 'from-emerald-500 to-emerald-600';
    if (progress >= 75) return 'from-blue-500 to-blue-600';
    if (progress >= 50) return 'from-amber-500 to-amber-600';
    if (progress >= 25) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getCategoryGradient = (category: Achievement['category']) => {
    const gradients = {
      time: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-800 dark:text-blue-200',
      concepts: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-800 dark:text-purple-200',
      streak: 'from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-800 dark:text-orange-200',
      performance: 'from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 text-emerald-800 dark:text-emerald-200',
      engagement: 'from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 text-pink-800 dark:text-pink-200'
    };

    return gradients[category] || gradients.time;
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/80 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-8 backdrop-blur-sm shadow-lg ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary-200 dark:border-primary-800 rounded-full animate-pulse-soft"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 animate-pulse">
              Loading achievements...
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Preparing your rewards 🏆
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl border border-red-200/60 dark:border-red-800/60 p-8 backdrop-blur-sm shadow-lg ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-gentle">
            <LockClosedIcon className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">Unable to load achievements</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const lockedAchievements = achievements.filter(a => !a.unlockedAt);
  const overallProgress = (unlockedAchievements.length / achievements.length) * 100;

  return (
    <div className={`bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/80 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 backdrop-blur-sm shadow-lg ${className}`}>
      {/* Header with animated gradient */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/25 animate-pulse-soft">
            <TrophyIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Achievements
            </h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {unlockedAchievements.length} of {achievements.length} unlocked
              </div>
              {overallProgress >= 50 && (
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            overallProgress >= 100
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
              : overallProgress >= 75
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
              : overallProgress >= 50
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {Math.round(overallProgress)}%
          </div>
        </div>
      </div>

      {/* Enhanced Progress Overview */}
      <div className="mb-8 p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Progress</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              {Math.round(overallProgress)}%
            </span>
            {overallProgress >= 100 && (
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
        </div>
        <div className="relative w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200/30 to-gray-300/30 dark:from-gray-700/30 dark:to-gray-600/30 animate-shimmer bg-[length:200%_100%]"></div>
          <div
            className={`relative h-full bg-gradient-to-r ${getProgressGradient(overallProgress)} rounded-full transition-all duration-1000 ease-out shadow-lg transform hover:scale-y-110 origin-left`}
            style={{ width: `${overallProgress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]"></div>
            {overallProgress > 0 && overallProgress < 100 && (
              <div className="absolute inset-0 flex items-center justify-end pr-2">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
        {overallProgress >= 25 && (
          <div className="mt-2 text-xs font-medium animate-fade-in">
            {overallProgress >= 100 && <span className="text-emerald-600 dark:text-emerald-400">🎉 Achievement Master! You've unlocked everything!</span>}
            {overallProgress >= 75 && overallProgress < 100 && <span className="text-blue-600 dark:text-blue-400">🌟 So close! You're almost there!</span>}
            {overallProgress >= 50 && overallProgress < 75 && <span className="text-purple-600 dark:text-purple-400">🚀 Great progress! You're halfway there!</span>}
            {overallProgress >= 25 && overallProgress < 50 && <span className="text-amber-600 dark:text-amber-400">💪 Good start! Keep going!</span>}
          </div>
        )}
      </div>

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-pulse-soft">
              <CheckCircleIcon className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-md font-bold text-gray-900 dark:text-gray-100">
              Unlocked Achievements ({unlockedAchievements.length})
            </h4>
            <div className="flex-1"></div>
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unlockedAchievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={`group relative p-4 bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-102 transition-all duration-300 cursor-pointer animate-fade-in-up`}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => setSelectedAchievement(selectedAchievement === achievement.id ? null : achievement.id)}
              >
                {/* Decorative corner accent */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-lg shadow-yellow-500/30"></div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-pulse-soft">
                      {getAchievementIcon(achievement, 'small')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {achievement.title}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {achievement.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getCategoryGradient(achievement.category)} font-medium`}>
                        {achievement.category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>{achievement.unlockedAt?.toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center shadow-lg">
              <LockClosedIcon className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-md font-bold text-gray-900 dark:text-gray-100">
              In Progress ({lockedAchievements.length})
            </h4>
          </div>
          <div className="space-y-3">
            {lockedAchievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={`group relative p-4 bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-900/80 dark:to-gray-800/80 rounded-xl border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm hover:border-primary-300/60 dark:hover:border-primary-700/60 transition-all duration-300 animate-fade-in-up`}
                style={{ animationDelay: `${index * 50 + 200}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center opacity-60">
                      {getAchievementIcon(achievement, 'small')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                      {achievement.title}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {achievement.description}
                    </p>

                    {/* Enhanced Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
                        <span className={`text-xs font-bold ${
                          achievement.progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' :
                          achievement.progress >= 75 ? 'text-blue-600 dark:text-blue-400' :
                          achievement.progress >= 50 ? 'text-amber-600 dark:text-amber-400' :
                          'text-orange-600 dark:text-orange-400'
                        }`}>
                          {achievement.progress}%
                        </span>
                      </div>
                      <div className="relative w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-200/30 to-gray-300/30 dark:from-gray-700/30 dark:to-gray-600/30 animate-shimmer bg-[length:200%_100%]"></div>
                        <div
                          className={`relative h-full bg-gradient-to-r ${getProgressGradient(achievement.progress)} rounded-full transition-all duration-700 ease-out hover:shadow-lg transform hover:scale-y-110 origin-left`}
                          style={{ width: `${achievement.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]"></div>
                          {achievement.progress > 0 && achievement.progress < 100 && (
                            <div className="absolute inset-0 flex items-center justify-end pr-1">
                              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrophyIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No achievements yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Start your learning journey to unlock amazing rewards!</p>
          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Achievements = React.memo(AchievementsComponent);