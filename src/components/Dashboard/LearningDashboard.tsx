import React, { useState, useEffect } from 'react';
import { ProgressChart, StudyStreak, SessionTracking, LearningTrends, Achievements } from '../Analytics';
import { SimpleAnalyticsModule, StudyMetrics } from '../../modules/analytics/simple-analytics';
import { LocalDatabaseModule } from '../../modules/database/local-database-module';

export const LearningDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<SimpleAnalyticsModule | null>(null);
  const [database, setDatabase] = useState<LocalDatabaseModule | null>(null);
  const [metrics, setMetrics] = useState<StudyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAnalytics();

    // Cleanup function to stop services on unmount
    return () => {
      // Store current values for cleanup
      const currentAnalytics = analytics;
      const currentDatabase = database;

      if (currentAnalytics) {
        currentAnalytics.stop().catch(console.error);
      }
      if (currentDatabase) {
        currentDatabase.stop().catch(console.error);
      }
    };
  }, []);

  const initializeAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize database module
      const db = new LocalDatabaseModule();
      await db.initialize();
      await db.start();
      setDatabase(db);

      // Initialize analytics module
      const analyticsModule = new SimpleAnalyticsModule();
      analyticsModule.databaseModule = db;
      await analyticsModule.initialize();
      await analyticsModule.start();
      setAnalytics(analyticsModule);

      // Get study metrics
      const studyMetrics = await analyticsModule.getStudyMetrics();
      setMetrics(studyMetrics);

      console.log('Analytics initialized successfully');
    } catch (err) {
      console.error('Failed to initialize analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Loading Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your learning dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error || !analytics || !metrics) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
            Analytics Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Failed to initialize the analytics module'}
          </p>
          <button
            onClick={initializeAnalytics}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Learning Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning progress and achievements
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Study Time</span>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.floor(metrics.totalStudyTime / 60)}h {metrics.totalStudyTime % 60}m
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessions Completed</span>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.sessionsCompleted}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Concepts Studied</span>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.conceptsStudied}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Accuracy Rate</span>
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(metrics.accuracyRate)}%
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Learning Progress</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <ProgressChart
                title="Study Goal"
                value={metrics.totalStudyTime}
                maxValue={600} // 10 hours
                color="blue"
                size="medium"
              />
              <ProgressChart
                title="Session Goal"
                value={metrics.sessionsCompleted}
                maxValue={30} // 30 sessions
                color="green"
                size="medium"
              />
              <ProgressChart
                title="Mastery"
                value={metrics.averageSessionLength}
                maxValue={60} // 60 minutes
                color="purple"
                size="medium"
              />
            </div>
          </div>

          <StudyStreak
            streakDays={metrics.streakDays}
            lastStudyDate={metrics.lastStudyDate}
          />
        </div>

        {/* Enhanced Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Learning Trends */}
          <LearningTrends analytics={analytics} />

          {/* Achievements */}
          <Achievements analytics={analytics} />
        </div>

        {/* Recent Sessions */}
        <div className="mb-8">
          <SessionTracking analytics={analytics} />
        </div>

        {/* Learning Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Learning Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium mb-1">Average Session Length</div>
              <div className="text-gray-900 dark:text-gray-100">
                {Math.round(metrics.averageSessionLength)} minutes
              </div>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium mb-1">Focus Score</div>
              <div className="text-gray-900 dark:text-gray-100">{metrics.focusScore}/100</div>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium mb-1">Questions Asked</div>
              <div className="text-gray-900 dark:text-gray-100">{metrics.questionsAsked}</div>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium mb-1">Correct Answers</div>
              <div className="text-gray-900 dark:text-gray-100">{metrics.correctAnswers}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};