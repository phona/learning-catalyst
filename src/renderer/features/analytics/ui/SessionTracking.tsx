import React from 'react';
import type { LearningSession } from '@/shared/types/analytics';

// Extended session interface for analytics display with additional UI properties
interface AnalyticsSession extends LearningSession {
  aiProvider?: string;
  aiModel?: string;
  sessionType?: 'chat' | 'study' | 'assessment' | 'review' | 'exploration';
  status?: 'completed' | 'in_progress' | 'paused';
  durationMinutes?: number;
  conceptsCovered?: string[];
}

// Interface for the analytics service in renderer context
interface RendererAnalyticsService {
  getStudyMetrics: () => Promise<{
    totalStudyTime: number;
    sessionsCompleted: number;
    averageSessionLength: number;
    conceptsStudied: number;
    questionsAsked: number;
    correctAnswers: number;
    accuracyRate: number;
    focusScore: number;
    streakDays: number;
    lastStudyDate?: Date;
  }>;
  getRecentSessions?: (limit?: number) => Promise<LearningSession[]>;
  getLearningTrends?: (period?: number) => Promise<unknown>;
  getAchievements?: () => Promise<unknown>;
  // Add other methods as needed
}

type SessionLoader = () => Promise<AnalyticsSession[]>;

interface SessionTrackingProps {
  analytics: RendererAnalyticsService;
  className?: string;
  loadSessions?: SessionLoader;
}

const defaultSessionLoader: SessionLoader = async (): Promise<AnalyticsSession[]> => [
  {
    id: 'session_1',
    title: 'React Fundamentals',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    duration: 60,
    concepts: ['react-hooks', 'state-management', 'components'],
    // Extended properties for UI
    durationMinutes: 60,
    conceptsCovered: ['react-hooks', 'state-management', 'components'],
    aiProvider: 'OpenAI',
    aiModel: 'gpt-4',
    sessionType: 'study',
    status: 'completed',
  },
  {
    id: 'session_2',
    title: 'JavaScript Async Patterns',
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    endTime: new Date(Date.now() - 23 * 60 * 60 * 1000),
    duration: 45,
    concepts: ['promises', 'async-await', 'callbacks'],
    // Extended properties for UI
    durationMinutes: 45,
    conceptsCovered: ['promises', 'async-await', 'callbacks'],
    aiProvider: 'ChatGLM',
    aiModel: 'glm-4',
    sessionType: 'study',
    status: 'completed',
  },
  {
    id: 'session_3',
    title: 'TypeScript Basics',
    startTime: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    endTime: new Date(Date.now() - 47 * 60 * 60 * 1000),
    duration: 30,
    concepts: ['types', 'interfaces', 'generics'],
    // Extended properties for UI
    durationMinutes: 30,
    conceptsCovered: ['types', 'interfaces', 'generics'],
    aiProvider: 'DeepSeek',
    aiModel: 'deepseek-chat',
    sessionType: 'review',
    status: 'completed',
  },
];

export const SessionTracking: React.FC<SessionTrackingProps> = ({
  analytics: _analytics,
  className = '',
  loadSessions: _loadSessions = defaultSessionLoader,
}) => {
  const [sessions, setSessions] = React.useState<AnalyticsSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadRecentSessions = React.useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const sessionData = await _loadSessions();
      setSessions(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [_loadSessions]);

  React.useEffect(() => {
    loadRecentSessions();
  }, [loadRecentSessions]);

  const getSessionTypeColor = (type?: AnalyticsSession['sessionType']): string => {
    const colors: Record<NonNullable<AnalyticsSession['sessionType']>, string> = {
      chat: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      study: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      assessment: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      review: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      exploration: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    };
    return colors[type ?? 'study'];
  };

  const getSessionTypeLabel = (type?: AnalyticsSession['sessionType']): string => {
    const labels: Record<NonNullable<AnalyticsSession['sessionType']>, string> = {
      chat: 'Chat',
      study: 'Study',
      assessment: 'Assessment',
      review: 'Review',
      exploration: 'Exploration',
    };
    return labels[type ?? 'study'];
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const totalStudyTime = sessions.reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0);
  const averageSessionLength = sessions.length > 0 ? totalStudyTime / sessions.length : 0;

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error != null && error !== '') {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="text-center text-red-600 dark:text-red-400">
          <svg
            className="w-6 h-6 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm">Error loading sessions: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Sessions</h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div
            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
            data-testid="session-total-time"
          >
            {formatDuration(totalStudyTime)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Time</div>
        </div>
        <div className="text-center">
          <div
            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
            data-testid="session-average-length"
          >
            {formatDuration(Math.round(averageSessionLength))}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Average Session</div>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg
            className="w-8 h-8 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <p>No sessions yet</p>
          <p className="text-sm">Start your first learning session</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{session.title}</h4>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getSessionTypeColor(session.sessionType)}`}
                >
                  {getSessionTypeLabel(session.sessionType)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {session.durationMinutes != null
                    ? formatDuration(session.durationMinutes)
                    : 'In progress'}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {getRelativeTime(session.startTime)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {session.aiProvider}
                </span>
              </div>

              {session.conceptsCovered != null && session.conceptsCovered.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {session.conceptsCovered.slice(0, 3).map((concept) => (
                    <span
                      key={`${session.id}-concept-${concept}`}
                      className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded"
                    >
                      {concept}
                    </span>
                  ))}
                  {session.conceptsCovered.length > 3 && (
                    <span className="inline-block text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                      +{session.conceptsCovered.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
