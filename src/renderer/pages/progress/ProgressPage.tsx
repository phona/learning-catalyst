import React, { useState, useEffect, useCallback } from 'react';
import {
  ProgressChart,
  StudyStreak,
  LearningTrends,
  Achievements,
  SessionTracking,
} from '@/renderer/features/analytics';
import type { StudyMetrics } from '@/renderer/services/analytics/analytics-service';
import type { LearningSession } from '@/shared/types/analytics';
import { useCatalystService, useAnalyticsService } from '@/renderer/services/services-provider';
import type { ActiveExecution } from '@/shared/types/electron-api/catalyst-api';
import type { AgentDisplay as ManagementAgentDisplay } from '@/shared/types/electron-api/agent-api';

// Manual refresh instead of automatic interval for better user control

export const ProgressPage: React.FC = () => {
  const catalystService = useCatalystService();
  const analyticsService = useAnalyticsService();
  const [metrics, setMetrics] = useState<StudyMetrics | null>(null);
  const [availableAgents, setAvailableAgents] = useState<ManagementAgentDisplay[]>([]);
  const [activeExecutions, setActiveExecutions] = useState<ActiveExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load agent information with proper error handling
  const loadAgentInformation = useCallback(async (): Promise<void> => {
    try {
      // Get available agents with proper typing
      const agentsResponse = await catalystService.getAvailableAgents();
      if (agentsResponse.success && agentsResponse.agents) {
        setAvailableAgents(agentsResponse.agents);
      } else {
        console.warn('Failed to get available agents:', agentsResponse.error);
      }

      // Get active executions with proper typing
      const executionsResponse = await catalystService.getActiveExecutions();
      if (executionsResponse.success && executionsResponse.executions) {
        setActiveExecutions(executionsResponse.executions);
      } else {
        console.warn('Failed to get active executions:', executionsResponse.error);
      }

      setError(null); // Clear any previous errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Failed to load agent information:', err);
      setError(errorMessage);
    }
  }, [catalystService]); // Keep catalystService dependency - it's stable in production

  const loadDashboardSessions = useCallback(async (): Promise<LearningSession[]> => {
    const sessions = await analyticsService.getRecentSessions(10);
    return sessions.map((session, index) => ({
      id: session.id ?? `session-${index}`,
      title: session.title ?? 'Session',
      startTime: new Date((session as any).createdAt ?? Date.now()),
      endTime: new Date((session as any).updatedAt ?? Date.now()),
      durationMinutes: (session as any).statistics?.sessionDuration ?? 0,
      aiProvider: (session as any).agent?.provider ?? 'Unknown',
      aiModel: (session as any).agent?.model ?? 'Unknown',
      concepts: (session as any).metadata?.topicsCovered ?? [],
      sessionType: 'study',
      status: 'completed',
    }));
  }, [analyticsService]);

  const mapStudyMetrics = (
    metrics: import('@/renderer/services/analytics/analytics-service').StudyMetrics,
  ) => ({
    totalStudyTime: metrics.totalStudyTime,
    sessionsCompleted: metrics.sessionsCompleted,
    conceptsMastered: metrics.conceptsStudied ?? 0,
    averageSessionDuration: metrics.averageSessionLength,
    studyStreak: metrics.streakDays,
    weeklyProgress: [],
    monthlyProgress: [],
    categoryBreakdown: [],
  });

  const mapLearningTrends = (
    trends: import('@/renderer/services/analytics/analytics-service').LearningTrends,
  ) => ({
    performanceOverTime: [],
    engagementPatterns: [],
    progressVelocity: [],
    retentionRate: [],
    skillDistribution: [],
    sessionTypes: trends.sessionTypes,
    dailyStudyTime: trends.dailyStudyTime,
    masteryProgress: trends.masteryProgress,
  });

  const mapAchievements = (
    achievements: import('@/renderer/services/analytics/analytics-service').Achievement[],
  ) =>
    achievements.map((a) => ({
      ...a,
      requirement:
        typeof a.requirement === 'object'
          ? {
            target: (a.requirement as any).target,
            current: (a.requirement as any).current,
            unit: (a.requirement as any).unit,
            metadata: (a.requirement as any).metadata,
          }
          : { target: undefined },
    }));

  // Setup dashboard and load initial data
  const setupDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load real metrics from analytics service
      const metrics = await analyticsService.getStudyMetrics();
      setMetrics(metrics);

      // Load agent information
      await loadAgentInformation();

      console.log('[LearningDashboard] Dashboard setup completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[LearningDashboard] Failed to setup dashboard:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [analyticsService, loadAgentInformation]);

  // Initial setup effect - run only once on mount
  useEffect(() => {
    setupDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only on mount

  // Manual refresh handler - user clicks to refresh agent information
  const handleRefresh = async () => {
    await loadAgentInformation();
  };

  // Error state display
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Dashboard</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => setupDashboard()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state display
  if (loading || !metrics) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Loading Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your learning dashboard with AI agents...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Learning Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your learning progress and achievements
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              title="Refresh agent status and execution data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Study Time
              </span>
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.floor(metrics.totalStudyTime / 60)}h {metrics.totalStudyTime % 60}m
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Sessions Completed
              </span>
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.sessionsCompleted}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Concepts Studied
              </span>
              <svg
                className="w-5 h-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.conceptsStudied}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Accuracy Rate
              </span>
              <svg
                className="w-5 h-5 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(metrics.accuracyRate)}%
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Agents
              </span>
              <svg
                className="w-5 h-5 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {availableAgents.filter((a) => a.isAvailable).length}/{availableAgents.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {activeExecutions.length} active
            </div>
          </div>
        </div>

        {/* Agent Status Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Available Agents */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <svg
                className="w-5 h-5 text-indigo-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
              Available AI Agents
            </h3>
            <div className="space-y-3">
              {availableAgents.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No agents available
                </div>
              ) : (
                availableAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${agent.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}
                      ></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {agent.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {agent.type} • {agent.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities?.slice(0, 2).map((capability) => (
                        <span
                          key={capability}
                          className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full"
                        >
                          {capability}
                        </span>
                      ))}
                      {agent.capabilities && agent.capabilities.length > 2 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                          +{agent.capabilities.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Executions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Active Executions
            </h3>
            <div className="space-y-3">
              {activeExecutions.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No active executions
                </div>
              ) : (
                activeExecutions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {execution.agentId || 'Unknown Agent'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {execution.status} • Started{' '}
                          {new Date(execution.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {execution.progress ? `${execution.progress}%` : 'In progress'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Learning Progress
            </h3>
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

          <StudyStreak streakDays={metrics.streakDays} lastStudyDate={metrics.lastStudyDate} />
        </div>

        {/* Enhanced Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Learning Trends */}
          <LearningTrends
            analytics={{
              getAchievements: async () =>
                mapAchievements(await analyticsService.getAchievements()),
              getStudyMetrics: async () =>
                mapStudyMetrics(await analyticsService.getStudyMetrics()),
              getLearningTrends: async (period?: number) =>
                mapLearningTrends(await analyticsService.getLearningTrends(period)),
            }}
          />

          {/* Achievements */}
          <Achievements
            analytics={{
              getStudyMetrics: async () =>
                mapStudyMetrics(await analyticsService.getStudyMetrics()),
              getLearningTrends: async () =>
                mapLearningTrends(await analyticsService.getLearningTrends()),
              getAchievements: async () =>
                mapAchievements(await analyticsService.getAchievements()),
            }}
          />
        </div>

        {/* Recent Sessions */}
        <div className="mb-8">
          <SessionTracking
            analytics={{
              getStudyMetrics: () => analyticsService.getStudyMetrics(),
              getLearningTrends: () => analyticsService.getLearningTrends(),
              getRecentSessions: (limit?: number) =>
                analyticsService.getRecentSessions(limit).then((sessions) =>
                  sessions.map((session, index) => ({
                    id: session.id ?? `session-${index}`,
                    title: session.title ?? 'Session',
                    startTime: new Date((session as any).createdAt ?? Date.now()),
                    endTime: new Date((session as any).updatedAt ?? Date.now()),
                    durationMinutes: (session as any).statistics?.sessionDuration ?? 0,
                    aiProvider: (session as any).agent?.provider ?? 'Unknown',
                    aiModel: (session as any).agent?.model ?? 'Unknown',
                    concepts: (session as any).metadata?.topicsCovered ?? [],
                    sessionType: 'study',
                    status: 'completed',
                  })),
                ),
            }}
            loadSessions={loadDashboardSessions}
          />
        </div>

        {/* Learning Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Learning Insights
          </h3>
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
export default ProgressPage;
