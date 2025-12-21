/**
 * Service Container
 *
 * Provides a centralized way to create and manage service instances
 * with explicit dependencies following the functional factory pattern
 */

import type { ElectronAPI, ChatAPI, KnowledgeAPI, LearningAPI, AnalyticsAPI } from '@/shared/types';
import type { APIResponse, SystemReadyPayload, ConfigChangedPayload } from '@/shared/types/electron-api/base';
import type { ChatHistoryMessage } from '@/shared/types/electron-api/chat-api';

import type {
  ConversationDisplay,
  MessageDisplay,
  TypingIndicator,
  ConversationSummary,
  ConversationHistory,
  ConversationContext,
  PracticeOpportunityResult,
  NaturalPracticeSuggestion,
  UserLearningContext,
} from '@/shared/types';

import type {
  SessionSearchQuery,
} from '@/shared/types/session';
import type { SessionCreateRequest, SessionUpdateRequest } from '@/renderer/types/session';

import type {
  KnowledgeSearchResultDisplay,
  ConceptExplorationDisplay,
  ConceptParsingResult,
  KnowledgeIngestionResult,
  RelatedConceptsDisplay,
  KnowledgeMapDisplay,
  ConceptIngestionPlan,
} from '@/shared/types/electron-api/knowledge-api';

import type {
  LearningPathDisplay,
  LearningProgressDisplay,
  LearningContext,
  SessionCompletionDisplay,
  SessionSearchResultDisplay,
  SessionDisplay,
  LearningSessionDisplay,
} from '@/shared/types/electron-api/learning-api';

import type {
  UsageStatsRequest,
  TokenUsageRequest,
  SessionHistoryRequest,
  LearningTrendsRequest,
  TimeStatsRequest,
  ExportDataRequest,
  ImportDataRequest,
  UsageStatsDisplay,
  TokenUsageDisplay,
  ProgressChartDisplay,
  RecentActivity,
  ImportResult,
  AchievementReward,
} from '@/shared/types/electron-api/analytics-api';
import type {
  DashboardDisplay as IDashboardDisplay,
  SessionDisplay as IAnalyticsSessionDisplay,
  StudyStreakDisplay as IStudyStreakDisplay,
  TimeStatsDisplay as ITimeStatsDisplay,
  ConceptProgressDisplay,
  LearningTrendDisplay,
  ConceptProgressUpdate,
} from '@/shared/types/analytics';

// Import analytics display types from the correct source
import type { AchievementDisplay } from '@/shared/types/electron-api/analytics-api';
import type { AchievementDisplay as IAchievementDisplay } from '@/shared/types/analytics';

import { createElectronAPIClient } from './api/electron-api-client';
import { createSessionService } from './session/session-service';
import { createChatService } from './chat/chat-service';
import { createAnalyticsService } from './analytics/analytics-service';
import { createFileService } from './file/file-service';
import type { SessionService } from './session/session-service';
import type { ChatService } from './chat/chat-service';
import type { AnalyticsService } from './analytics/analytics-service';

type FileService = ReturnType<typeof createFileService>;

/**
 * Service container interface
 */
export interface ServiceContainer {
  session: SessionService;
  chat: ChatService;
  analytics: AnalyticsService;
  file: FileService;
}

/**
 * Creates a service container with the given electronAPI client
 */
export function createServiceContainer(electronAPI: ElectronAPI): ServiceContainer {
  const apiClient = electronAPI;

  const session = createSessionService(apiClient);
  const chat = createChatService(apiClient);
  const analytics = createAnalyticsService(apiClient);
  const file = createFileService(apiClient);

  return {
    session,
    chat,
    analytics,
    file,
  };
}

/**
 * Creates a test service container with mock dependencies
 */
export function createTestServiceContainer(
  mockElectronAPI: Partial<ElectronAPI>,
): ServiceContainer {
  // Create a mock electronAPI for testing with proper typing
  const fullMockAPI: ElectronAPI = {
    // ChatAPI with correct interface matching src/shared/types/electron-api/chat-api.ts
    chat: {
      generateTitle: async (messageText: string): Promise<APIResponse<string>> => ({
        success: true,
        data: `Mock title for: ${messageText.slice(0, 50)}...`,
      }),
      getMessages: async (
        threadId: string,
        options?: { limit?: number; offset?: number },
      ): Promise<APIResponse<{sessions: ChatHistoryMessage[], hasMore: boolean, total: number}>> => ({
        success: true,
        data: {
          sessions: [],
          hasMore: false,
          total: 0,
        },
      }),
    },
    sessions: {
      list: async (options?: { query?: string; limit?: number; offset?: number }) => ({
        success: true,
        data: { sessions: [], total: 0, hasMore: false },
      }),
      create: async (payload: SessionCreateRequest) => ({
        success: true,
        data: { sessionId: 'mock-session-id', session: undefined },
      }),
      get: async (sessionId: string) => ({
        success: true,
        data: undefined,
      }),
      delete: async (sessionId: string) => ({
        success: true,
        data: { deleted: true },
      }),
      update: async (sessionId: string, updates: SessionUpdateRequest) => ({
        success: true,
        data: undefined,
      }),
      updateTitle: async (sessionId: string, title: string) => ({
        success: true,
      }),
      getRecentSessions: async (options?: { limit?: number }) => ({
        success: true,
        data: [],
      }),
      search: async (query: SessionSearchQuery) => ({
        success: true,
        data: { sessions: [], total: 0, hasMore: false },
      }),
      getStatistics: async () => ({
        success: true,
        data: {
          totalSessions: 0,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokensUsed: 0,
          averageMessagesPerSession: 0,
        },
      }),
    },
    analytics: {
      getDashboard: (): Promise<APIResponse<IDashboardDisplay>> =>
        Promise.resolve({
          success: true,
          data: {
            recentSessions: [],
            conceptProgress: [],
            achievements: [],
            learningTrends: [],
            studyStreak: {
              currentStreak: 0,
              longestStreak: 0,
              lastStudyDate: new Date(),
              streakHistory: [],
            },
            timeStats: {
              totalStudyTime: 0,
              averageSessionTime: 0,
              totalSessions: 0,
              mostProductiveHour: 9,
              studyDaysThisMonth: 0,
              studyDaysThisWeek: 0,
            },
          } as IDashboardDisplay,
        }),
      getProgressChart: (params: {
        timeRange: '7days' | '30days' | '90days' | '1year';
        topic?: string | null;
        metric: 'mastery' | 'sessions' | 'time' | 'concepts';
        conceptIds?: string[];
        includeGoal?: boolean;
      }): Promise<APIResponse<ProgressChartDisplay>> =>
        Promise.resolve({
          success: true,
          data: {
            timeRange: params.timeRange,
            topic: params.topic || 'mock-topic',
            chartType: 'line',
            data: [],
            summary: {
              totalSessions: 0,
              totalMinutes: 0,
              totalConcepts: 0,
              trend: 'stable' as const,
              averagePerDay: 0,
              bestDay: 'Monday',
            },
            insights: [],
          } as ProgressChartDisplay,
        }),
      getAchievements: (): Promise<APIResponse<AchievementDisplay[]>> =>
        Promise.resolve({ success: true, data: [] }),
      unlockAchievement: async (
        achievementId: string,
      ): Promise<APIResponse<AchievementReward>> => ({
        success: true,
        data: { type: 'badge', value: 'mock', description: 'Mock reward' },
      }),
      getUsageStats: async (
        params: UsageStatsRequest,
      ): Promise<APIResponse<UsageStatsDisplay>> => ({
        success: true,
        data: {
          timeRange: params.timeRange,
          sessions: {
            total: 156,
            averagePerDay: 5.2,
            averageDuration: '18.5 minutes',
            completionRate: 87.3,
            mostProductiveTime: '10:00 AM',
            mostProductiveDay: 'Tuesday',
          },
          learning: {
            conceptsLearned: 34,
            skillsImproved: ['Algebra', 'Geometry', 'Calculus'],
            topicsExplored: 12,
            exercisesCompleted: 287,
            accuracy: 87.3,
          },
          engagement: {
            activeDays: 28,
            consistencyStreak: 12,
            averageSessionRating: 4.2,
            featureUsage: {
              Practice: 45,
              Study: 32,
              Review: 23,
            },
            dropOffPoints: ['Advanced topics', 'Complex problems'],
          },
          patterns: {
            peakHours: [9, 10, 14, 15],
            preferredTopics: ['Mathematics', 'Physics'],
            learningStyle: 'Visual-Analytical',
            sessionLengthPreference: 'Short bursts',
            improvementAreas: ['Speed', 'Advanced concepts'],
          },
        },
      }),
      getTokenUsage: async (
        params: TokenUsageRequest,
      ): Promise<APIResponse<TokenUsageDisplay>> => ({
        success: true,
        data: {
          timeRange: params.timeRange,
          usage: {
            totalTokens: 125000,
            inputTokens: 75000,
            outputTokens: 50000,
            averageTokensPerSession: 2500,
            peakUsageDay: 'Tuesday',
          },
          cost: {
            totalCost: '$3.75',
            averageCostPerSession: '$0.075',
            costPerToken: '$0.00003',
            projectedMonthlyCost: '$45.00',
          },
          byProvider: [
            {
              provider: 'OpenAI',
              tokens: 100000,
              cost: '$3.00',
              percentage: 80,
              model: 'gpt-4',
            },
            {
              provider: 'Anthropic',
              tokens: 25000,
              cost: '$0.75',
              percentage: 20,
              model: 'claude-3',
            },
          ],
          byFeature: [
            {
              feature: 'Chat',
              tokens: 75000,
              cost: '$2.25',
              sessions: 50,
              efficiency: 0.85,
            },
            {
              feature: 'Analysis',
              tokens: 50000,
              cost: '$1.50',
              sessions: 25,
              efficiency: 0.92,
            },
          ],
          trends: {
            usageTrend: 'increasing' as const,
            costTrend: 'stable' as const,
            efficiencyTrend: 'improving' as const,
          },
          recommendations: [
            'Consider optimizing prompts to reduce token usage',
            'Batch similar requests to improve efficiency',
          ],
        },
      }),
      updateConceptProgress: async (
        conceptId: string,
        update: ConceptProgressUpdate,
      ): Promise<APIResponse<void>> => ({ success: true }),
      getLearningTrends: async (
        params: LearningTrendsRequest,
      ): Promise<APIResponse<LearningTrendDisplay>> => ({
        success: true,
        data: {
          period: params.period,
          dataPoints: [],
          average: 0,
          peak: 0,
          improvement: 0,
        } as LearningTrendDisplay,
      }),
      getStudyStreak: async (): Promise<APIResponse<IStudyStreakDisplay>> => ({
        success: true,
        data: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: new Date(),
          streakHistory: [],
        } as IStudyStreakDisplay,
      }),
      getTimeStats: async (params?: TimeStatsRequest): Promise<APIResponse<ITimeStatsDisplay>> => ({
        success: true,
        data: {
          totalStudyTime: 0,
          averageSessionTime: 0,
          totalSessions: 0,
          mostProductiveHour: 9,
          studyDaysThisMonth: 0,
          studyDaysThisWeek: 0,
        } as ITimeStatsDisplay,
      }),
      getConceptProgress: async (
        conceptId: string,
      ): Promise<APIResponse<ConceptProgressDisplay>> => ({
        success: true,
        data: {
          conceptId,
          conceptName: `Concept ${conceptId}`,
          masteryLevel: 0,
          totalSessions: 0,
          lastStudied: new Date(),
          trend: 'stable',
          relatedConcepts: [],
          prerequisites: [],
          nextSteps: [],
        } as ConceptProgressDisplay,
      }),
      getSessionHistory: async (
        params?: SessionHistoryRequest,
      ): Promise<APIResponse<IAnalyticsSessionDisplay[]>> => ({ success: true, data: [] }),
      checkAchievements: async (
        sessionId?: string,
      ): Promise<APIResponse<IAchievementDisplay[]>> => ({ success: true, data: [] }),
      exportData: async (params: ExportDataRequest): Promise<APIResponse<string>> => ({
        success: true,
        data: '{}',
      }),
      importData: async (params: ImportDataRequest): Promise<APIResponse<ImportResult>> => ({
        success: true,
        data: {
          recordsProcessed: 0,
          recordsImported: 0,
          recordsSkipped: 0,
          errors: [],
          warnings: [],
        } as ImportResult,
      }),
      trackSession: async (): Promise<APIResponse<string>> => ({
        success: true,
        data: 'mock-tracking-id',
      }),
    },
    knowledge: {
      searchKnowledge: async (
        query: string,
      ): Promise<APIResponse<KnowledgeSearchResultDisplay>> => ({
        success: true,
        data: {
          query,
          results: [],
          totalResults: 0,
          searchTime: '0ms',
          suggestions: [],
          filters: {
            categories: [],
            difficulties: [],
            types: [],
          },
        },
      }),
      exploreConcept: async (params: {
        conceptName: string;
        depth: 'basic' | 'intermediate' | 'advanced';
      }): Promise<APIResponse<ConceptExplorationDisplay>> => ({
        success: true,
        data: {
          concept: {
            id: 'mock-concept',
            name: params.conceptName,
            category: 'mock-category',
          },
          definition: 'Mock definition',
          keyPoints: [],
          relatedConcepts: [],
          examples: [],
          difficulty: params.depth,
          estimatedLearningTime: '30 min',
          prerequisites: [],
          learningOutcomes: [],
        } as ConceptExplorationDisplay,
      }),
      parseConcepts: async (params: {
        files?: Array<{
          fileName: string;
          filePath: string;
          content: string;
          title?: string;
          materialId?: string;
        }>;
        content?: string;
        materialId?: string;
        title?: string;
        format?: 'markdown' | 'text' | 'html';
        options?: {
          confidenceThreshold?: number;
          maxConceptsPerFile?: number;
        };
      }): Promise<APIResponse<ConceptParsingResult>> => ({
        success: true,
        data: {
          success: true,
          concepts: [],
          relationships: [],
          statistics: {
            totalConcepts: 0,
            validConcepts: 0,
            totalRelationships: 0,
            confidenceDistribution: {},
            difficultyDistribution: {},
            typeDistribution: {},
            processingTime: 0,
            modelUsage: {},
          },
          errors: [],
          metadata: {
            processingTime: 0,
            processedAt: new Date().toISOString(),
            inputFiles: params.files?.length || 0,
            aiProvider: undefined,
            aiModel: undefined,
          },
        },
      }),
      ingestConcepts: async (params: {
        result: ConceptParsingResult;
        plan?: ConceptIngestionPlan;
        options?: {
          userId?: string;
          materialId?: string;
          sessionId?: string;
          source?: string;
        };
      }): Promise<APIResponse<KnowledgeIngestionResult>> => ({
        success: true,
        data: {
          conceptsInserted: 0,
          conceptsUpdated: 0,
          relationshipsInserted: 0,
          metadata: {
            processedAt: new Date().toISOString(),
            source: undefined,
          },
        },
      }),
      getRelatedConcepts: async (
        conceptId: string,
      ): Promise<APIResponse<RelatedConceptsDisplay>> => ({
        success: true,
        data: {
          conceptId,
          relatedConcepts: [],
          totalConnections: 0,
          strongestConnection: '',
          categories: [],
          learningPaths: [],
        } as RelatedConceptsDisplay,
      }),
      getKnowledgeMap: async (sessionId?: string): Promise<APIResponse<KnowledgeMapDisplay>> => ({
        success: true,
        data: {
          nodes: [],
          edges: [],
          layout: 'force-directed',
          clusters: [],
          metadata: {
            totalNodes: 0,
            totalEdges: 0,
            centerConcepts: [],
            learningPaths: [],
          },
        } as KnowledgeMapDisplay,
      }),
      clearParsingJobs: async (): Promise<APIResponse<{ removed: number }>> => ({
        success: true,
        data: { removed: 0 },
      }),
    },
    learning: {
      getLearningPath: async (sessionId: string): Promise<APIResponse<LearningPathDisplay>> => ({
        success: true,
        data: {
          sessionId,
          path: [],
          currentPosition: 0,
          estimatedCompletion: '30 min',
          progress: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        } as LearningPathDisplay,
      }),
      startLearningSession: async (params: {
        topic: string;
        goals: string[];
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        agentType: string;
        learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
      }): Promise<APIResponse<LearningSessionDisplay>> => ({
        success: true,
        data: {
          id: 'mock-session',
          topic: params.topic,
          goals: params.goals,
          difficulty: params.difficulty,
          status: 'active',
          progress: {
            percentage: 0,
            completedGoals: [],
            currentGoal: params.goals[0] || null,
            timeSpent: '0 min',
          },
          estimatedDuration: '30 min',
          agent: {
            type: params.agentType,
            name: 'Mock Agent',
          },
          learningStyle: params.learningStyle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as LearningSessionDisplay,
      }),
      getSessionProgress: async (
        sessionId: string,
      ): Promise<APIResponse<LearningProgressDisplay>> => ({
        success: true,
        data: {
          sessionId,
          percentage: 0,
          completedGoals: [],
          currentGoal: '',
          remainingGoals: [],
          timeSpent: '0 min',
          conceptsMastered: [],
          strugglingConcepts: [],
          achievements: [],
          progressByGoal: [],
        } as LearningProgressDisplay,
      }),
      pauseSession: async (sessionId: string): Promise<APIResponse<{ resumeData: unknown }>> => ({
        success: true,
        data: { resumeData: {} },
      }),
      resumeSession: async (sessionId: string): Promise<APIResponse<LearningContext>> => ({
        success: true,
        data: {
          sessionId,
          lastActivity: new Date().toISOString(),
          currentProgress: {
            sessionId,
            percentage: 0,
            completedGoals: [],
            currentGoal: '',
            remainingGoals: [],
            timeSpent: '0 min',
            conceptsMastered: [],
            strugglingConcepts: [],
            achievements: [],
            progressByGoal: [],
          },
          nextSteps: [],
          contextSummary: 'Mock context',
          agentMemory: {
            keyPoints: [],
            userStruggles: [],
            userStrengths: [],
          },
        } as LearningContext,
      }),
      completeSession: async (
        sessionId: string,
      ): Promise<APIResponse<SessionCompletionDisplay>> => ({
        success: true,
        data: {
          sessionId,
          summary: {
            timeSpent: '30 min',
            conceptsLearned: 0,
            goalsCompleted: 0,
            achievementsUnlocked: [],
          },
          performance: {
            finalScore: 0,
            strengthAreas: [],
            improvementAreas: [],
          },
          recommendations: {
            nextTopics: [],
            reviewTopics: [],
            practiceExercises: [],
          },
          insights: [],
        } as SessionCompletionDisplay,
      }),
      getRecentSessions: async (options?: {
        limit?: number;
        agentType?: string;
        status?: string;
      }): Promise<APIResponse<SessionDisplay[]>> => ({
        success: true,
        data: [],
      }),
      searchSessions: async (
        query: string,
        filters?: {
          difficulty?: 'beginner' | 'intermediate' | 'advanced';
          agentType?: string;
          dateRange?: { start: Date; end: Date };
          tags?: string[];
        },
      ): Promise<APIResponse<SessionSearchResultDisplay>> => ({
        success: true,
        data: {
          sessions: [],
          totalResults: 0,
          query,
          filters: {
            appliedFilters: (filters || {}) as Record<string, any>,
            availableFilters: {},
          },
          suggestions: [],
          pagination: {
            hasMore: false,
          },
        } as SessionSearchResultDisplay,
      }),
    },
    aiSDK: {
      stream: (
        params: {
          messages: Array<{ role: string; content: string }>;
          conversationId?: string;
        },
        callback: (data?: unknown) => void,
        onComplete?: () => void,
      ) => () => {},
    },
    // Include other required API domains with minimal mocks
    agents: {} as any,
    content: {} as any,
    settings: {} as any,
    catalyst: {} as any,
    getWorkspacePath: async () => '/mock/workspace',
    readDirectory: async () => [],
    readFile: async () => '',
    writeFile: async () => Promise.resolve(),
    existsFile: async () => false,
    showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
    showSaveDialog: async () => ({ canceled: true, filePath: '' }),
    onMenuAction: () => {},
    onIPCError: () => () => {},
    handleError: () => {},
    healthCheck: async () => ({ status: 'healthy' as const, apis: {} }),
    getVersion: async () => ({ version: '1.0.0', build: 'mock', platform: 'mock' }),
    trackEvent: async () => {},
    getErrorBuffer: async () => [],
    clearErrorBuffer: async () => ({ cleared: true }),
    relaunchApp: async () => ({ relaunching: false }),
    awaitReady: async (options?: { timeoutMs?: number }): Promise<SystemReadyPayload> => ({
      status: 'ready' as const,
      ready: { ipcHandlersRegistered: true },
    }),
    awaitConfigChange: async (options?: { timeoutMs?: number }): Promise<ConfigChangedPayload> => ({
      changedKeys: [],
      timestamp: Date.now(),
    }),
    ...mockElectronAPI,
  };

  return createServiceContainer(fullMockAPI as ElectronAPI);
}

/**
 * Create a fully mocked service container for renderer tests that bypass Electron startup.
 */
export function createMockServiceContainer(
  overrides?: Partial<ElectronAPI>,
): ServiceContainer {
  return createTestServiceContainer(overrides || {});
}

// Export the service factory functions for direct use
export {
  createSessionService,
  createChatService,
  createAnalyticsService,
  createFileService,
};

// Re-export types for convenience
export type { SessionService } from './session/session-service';
export type { ChatService } from './chat/chat-service';
export type { AnalyticsService } from './analytics/analytics-service';
export type { FileService } from './file/file-service';
