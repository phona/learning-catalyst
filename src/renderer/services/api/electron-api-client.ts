import type { ElectronAPI, AppConfig } from '@/shared/types';
import type { ProviderConfig } from '@/shared/types';
import type { AgentDisplay as AgentsAgentDisplay, AgentContext as AgentsAgentContext } from '@/shared/types/electron-api/agent-api';
import { ChatHistoryMessage, ChatStreamEvent } from '@/shared/types/electron-api/chat-api';
import type { SessionDisplay } from '@/shared/types/electron-api/sessions-api';
import type { AISDKStreamParams } from '@/shared/types/electron-api/base';
import { AIMessage } from 'langchain';

// Local type definitions for mock data (removed from shared types)
interface AgentContext {
  sessionId: string;
  agentId: string;
  agentSettings: {
    agentId: string;
    personality: string;
    responseStyle: {
      detailLevel: string;
      includeExamples: boolean;
      useAnalogies: boolean;
      provideStepByStep: boolean;
      language: string;
      technicalDepth: string;
    };
    interaction: {
      enableFollowUpQuestions: boolean;
      proactiveSuggestions: boolean;
      encouragementLevel: string;
      humorLevel: string;
    };
    preferences: {
      responseLength: string;
      formalityLevel: string;
      useEmojis: boolean;
    };
  };
  sessionHistory: {
    previousSessions: number;
    avgRating: number;
    totalInteractionTime: string;
  };
  personalizedSettings: {
    preferredTopics: string[];
    avoidedTopics: string[];
    communicationStyle: string;
    pacePreference: string;
  };
  initialContext: unknown[];
}

interface AgentCapabilitiesDisplay {
  agentId: string;
  capabilities: string[];
  overallStrengths: string[];
  idealUseCases: string[];
  limitations: string[];
  performanceMetrics: {
    accuracy: number;
    responseTime: string;
    userSatisfaction: number;
  };
  supportedFeatures: string[];
  integrationPartners: string[];
}

interface FeatureDemoDisplay {
  agentId: string;
  feature: string;
  demoType: string;
  description: string;
  samplePrompts: string[];
  demoInteraction: {
    type: string;
    steps: unknown[];
  };
  expectedOutcome: string;
  estimatedTime: string;
  difficulty: string;
}

type ElectronWindow = Window & { electronAPI?: ElectronAPI };

// Helper to create properly formatted API response errors
const createAPIError = (code: string, message: string, details?: Record<string, unknown>) => ({
  code,
  message,
  details,
});

export function createElectronAPIClient(): ElectronAPI {
  const electronAPI = (window as ElectronWindow).electronAPI;
  if (electronAPI === undefined) {
    const mode = (import.meta as any)?.env?.MODE;
    const enableMocks = ((import.meta as any)?.env?.VITE_ENABLE_BROWSER_MOCKS ?? 'false') === 'true';
    const isTest = mode === 'test';
    if (isTest || enableMocks) {
      return createMockElectronAPIClient();
    }
    throw new Error('Electron API not available');
  }
  return electronAPI;
}

const agentStats = { sessionsCount: 0, avgRating: 0 };

const mockAgent: AgentsAgentDisplay = {
  id: 'agent_mock',
  type: 'learning',
  name: 'Mock Agent',
  description: 'Test agent',
  status: 'available',
  isAvailable: true,
  capabilities: ['explanation', 'practice'],
};

// Local type definitions for mock data
interface LegacyAgentContext {
  sessionId: string;
  agentId: string;
  agentSettings: {
    agentId: string;
    personality: string;
    responseStyle: string | {
      detailLevel: string;
      includeExamples: boolean;
      useAnalogies: boolean;
      provideStepByStep: boolean;
      language: string;
      technicalDepth: string;
    };
    detailLevel?: string;
    includeExamples?: boolean;
    useAnalogies?: boolean;
    provideStepByStep?: boolean;
    language?: string;
    technicalDepth?: string;
    interaction: {
      enableFollowUpQuestions: boolean;
      proactiveSuggestions: boolean;
      encouragementLevel: string;
      humorLevel: string;
    };
    preferences: {
      responseLength: string;
      formalityLevel: string;
      useEmojis: boolean;
    };
  };
  sessionHistory: {
    previousSessions: number;
    avgRating: number;
    totalInteractionTime: string;
  };
  personalizedSettings: {
    preferredTopics: string[];
    avoidedTopics: string[];
    communicationStyle: string;
    pacePreference: string;
  };
  initialContext: unknown[];
}

const mockAgentContext: LegacyAgentContext = {
  sessionId: 'mock-session',
  agentId: mockAgent.id,
  agentSettings: {
    agentId: mockAgent.id,
    personality: 'friendly encouraging',
    responseStyle: 'balanced' as any, // Cast to any to match the mock structure
    detailLevel: 'balanced',
    includeExamples: true,
    useAnalogies: false,
    provideStepByStep: false,
    language: 'en',
    technicalDepth: 'beginner',
    interaction: {
      enableFollowUpQuestions: true,
      proactiveSuggestions: true,
      encouragementLevel: 'moderate',
      humorLevel: 'light',
    },
    preferences: {
      responseLength: 'medium',
      formalityLevel: 'casual',
      useEmojis: true,
    },
  },
  sessionHistory: {
    previousSessions: 0,
    avgRating: 0,
    totalInteractionTime: '0m',
  },
  personalizedSettings: {
    preferredTopics: [],
    avoidedTopics: [],
    communicationStyle: 'casual',
    pacePreference: 'medium',
  },
  initialContext: [],
};

const mockCapabilities = {
  supportsStreaming: true,
  supportsContext: true,
  supportsTools: true,
  supportedModels: ['gpt-4', 'claude-3'],
};

const mockFeatureDemo = {
  featureName: 'mock-feature',
  description: 'Mock feature demo',
  result: {},
};

export function createMockElectronAPIClient(): ElectronAPI {
  const mockStreamState = new Map<string, { aborted: boolean }>();
  // In-memory storage for dev mode
  const mockSessions = new Map<string, SessionDisplay>();
  const mockMessages = new Map<string, {sessions: ChatHistoryMessage[], hasMore: boolean, total: number}>();

  const partial: Partial<ElectronAPI> = {
    aiSDK: {
      stream: (
        params: AISDKStreamParams,
        callback: (data: unknown) => void,
        onComplete?: () => void,
      ) => {
        const { port1, port2 } = new MessageChannel();
        const streamId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const threadId = params.conversationId || `thread_${Date.now()}`;

        console.log('[Mock aiSDK] stream called with conversationId:', params.conversationId);

        // Store the user message
        const userText = (() => {
          if ('newUserMessage' in params) {
            const delta = params.newUserMessage;
            if (typeof delta === 'string') return delta;
            if (delta?.content) return String(delta.content);
            const parts = delta?.parts ?? [];
            return parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
          }
          const messages = params.messages ?? [];
          const last = messages[messages.length - 1] as any;
          return last?.content ? String(last.content) : '';
        })();

        if (userText.trim().length > 0) {
          const newMockMessages = mockMessages.get(threadId) || {sessions: [], hasMore: false, total: 0};
          const existingMessages = newMockMessages.sessions || [];
          existingMessages.push({
            id: `${threadId}-${existingMessages.length}`,
            role: 'user',
            content: userText,
            timestamp: new Date().toISOString(),
          });
          mockMessages.set(threadId, newMockMessages);
        }

        // Set up message handling
        port1.onmessage = (event) => {
          callback(event.data);
        };
        // @ts-ignore
        port1.onclose = () => {
          console.log('[Mock aiSDK] Stream ended:', streamId);
          onComplete?.();
        };

        // Simulate a response
        setTimeout(() => {
          const responseMessage: ChatHistoryMessage = {
            id: `${threadId}-${(mockMessages.get(threadId) || {sessions: []}).sessions.length}`,
            role: 'assistant',
            content: 'This is a mock response. Chat functionality is not available in dev mode.',
            timestamp: new Date().toISOString(),
          };

          // Add assistant message to storage
          const newMockMessages = mockMessages.get(threadId) || {sessions: [], hasMore: false, total: 0};
          const existingMessages = newMockMessages.sessions || [];
          existingMessages.push(responseMessage);
          mockMessages.set(threadId, newMockMessages);

          callback({
            type: 'text-delta',
            content: [{ type: 'text', text: responseMessage.content }],
          });

          // Send finish event
          callback({
            type: 'finish',
            content: [{ type: 'text', text: responseMessage.content }],
          });

          port1.close();
          onComplete?.();
        }, 100);

        // Return cleanup function
        return () => {
          port1.close();
        };
      },
    },
    awaitReady: async () => ({ status: 'ready', ready: { ipcHandlersRegistered: true } }),
    awaitConfigChange: async () => ({
      changedKeys: [],
      config: {},
      timestamp: Date.now(),
    }),
    analytics: {
      getDashboard: () =>
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
          },
        }),
      getProgressChart: () =>
        Promise.resolve({
          success: true,
          data: {
            timeRange: '7days',
            topic: 'mock-topic',
            chartType: 'line',
            data: [],
            summary: {
              totalSessions: 0,
              totalMinutes: 0,
              totalConcepts: 0,
              trend: 'stable',
              averagePerDay: 0,
              bestDay: 'Monday',
            },
            insights: [],
          },
        }),
      getAchievements: () => Promise.resolve({ success: true, data: [] }),
      unlockAchievement: () =>
        Promise.resolve({
          success: true,
          data: {
            type: 'badge',
            value: 'mock-achievement',
            description: 'Mock achievement unlocked',
            icon: 'mock-icon',
          },
        }),
      getUsageStats: () =>
        Promise.resolve({
          success: true,
          data: {
            timeRange: '7days',
            sessions: {
              total: 0,
              averagePerDay: 0,
              averageDuration: '0m',
              completionRate: 0,
              mostProductiveTime: 'morning',
              mostProductiveDay: 'Monday',
            },
            learning: {
              conceptsLearned: 0,
              skillsImproved: [],
              topicsExplored: 0,
              exercisesCompleted: 0,
              accuracy: 0,
            },
            engagement: {
              activeDays: 0,
              consistencyStreak: 0,
              averageSessionRating: 0,
              featureUsage: {},
              dropOffPoints: [],
            },
            patterns: {
              peakHours: [],
              preferredTopics: [],
              learningStyle: 'visual',
              sessionLengthPreference: 'medium',
              improvementAreas: [],
            },
          },
        }),
      getTokenUsage: () =>
        Promise.resolve({
          success: true,
          data: {
            timeRange: '7days',
            usage: {
              totalTokens: 0,
              inputTokens: 0,
              outputTokens: 0,
              averageTokensPerSession: 0,
              peakUsageDay: 'Monday',
            },
            cost: {
              totalCost: '$0.00',
              averageCostPerSession: '$0.00',
              costPerToken: '$0.00',
              projectedMonthlyCost: '$0.00',
            },
            byProvider: [],
            byFeature: [],
            trends: {
              usageTrend: 'stable',
              costTrend: 'stable',
              efficiencyTrend: 'stable',
            },
            recommendations: [],
          },
        }),
      checkAchievements: () => Promise.resolve({ success: true, data: [] }),
      trackSession: () => Promise.resolve({ success: true, data: 'test-session-id' }),
      getConceptProgress: () =>
        Promise.resolve({
          success: true,
          data: {
            conceptId: 'mock-concept',
            conceptName: 'Mock Concept',
            masteryLevel: 0,
            totalSessions: 0,
            lastStudied: new Date(),
            trend: 'stable',
            relatedConcepts: [],
            prerequisites: [],
            nextSteps: [],
          },
        }),
      updateConceptProgress: () => Promise.resolve({ success: true }),
      getSessionHistory: () => Promise.resolve({ success: true, data: [] }),
      getLearningTrends: () =>
        Promise.resolve({
          success: true,
          data: {
            period: 'daily',
            dataPoints: [],
            average: 0,
            peak: 0,
            improvement: 0,
          },
        }),
      getStudyStreak: () =>
        Promise.resolve({
          success: true,
          data: {
            currentStreak: 0,
            longestStreak: 0,
            lastStudyDate: new Date(),
            streakHistory: [],
          },
        }),
      getTimeStats: () =>
        Promise.resolve({
          success: true,
          data: {
            totalStudyTime: 0,
            averageSessionTime: 0,
            totalSessions: 0,
            mostProductiveHour: 9,
            studyDaysThisMonth: 0,
            studyDaysThisWeek: 0,
          },
        }),
      exportData: () => Promise.resolve({ success: true, data: '{}' }),
      importData: () => Promise.resolve({ success: true }),
    },
    sessions: {
      list: () => {
        const sessions = Array.from(mockSessions.values());
        return Promise.resolve({
          success: true,
          data: { sessions, total: sessions.length, hasMore: false },
        });
      },
      create: (payload: { title?: string; threadId?: string }) => {
        const sessionId = payload.threadId || `session_${Date.now()}`;
        const session: SessionDisplay = {
          id: sessionId,
          title: payload.title || 'New Chat',
          topic: 'General',
          difficulty: 'beginner',
          status: 'active',
          progress: 0,
          duration: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockSessions.set(sessionId, session);
        return Promise.resolve({
          success: true,
          data: { sessionId, session },
        });
      },
      get: (id: string) => {
        const session = mockSessions.get(id);
        if (!session) {
          return Promise.resolve({
            success: false,
            error: createAPIError('sessions.not_found', 'Session not found'),
          });
        }
        return Promise.resolve({
          success: true,
          data: session,
        });
      },
      update: (id: string, updates: { title?: string; status?: string }) => {
        const session = mockSessions.get(id);
        if (!session) {
          return Promise.resolve({
            success: false,
            error: createAPIError('sessions.not_found', 'Session not found'),
          });
        }
        if (updates.title !== undefined) {
          session.title = updates.title;
        }
        if (updates.status !== undefined) {
          session.status = updates.status as 'active' | 'paused' | 'completed';
        }
        return Promise.resolve({
          success: true,
          data: session,
        });
      },
      getRecentSessions: (limit?: number) => Promise.resolve({ success: true, data: [] }),
      getGlobalStatistics: () =>
        Promise.resolve({
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
      searchSessions: (query: string) => Promise.resolve({ success: true, data: [] }),
      delete: (sessionId: string) => {
        mockSessions.delete(sessionId);
        return Promise.resolve({
          success: true,
          data: { deleted: true },
        });
      },
      updateTitle: (sessionId: string, title: string) => {
        const session = mockSessions.get(sessionId);
        if (!session) {
          return Promise.resolve({
            success: false,
            error: createAPIError('sessions.not_found', 'Session not found'),
          });
        }
        session.title = title;
        return Promise.resolve({
          success: true,
        });
      },
    },
    chat: {
      generateTitle: (messageText: string) =>
        Promise.resolve({
          success: true,
          data: messageText.split(' ').slice(0, 5).join(' ') || 'Mock Title',
        }),
      getMessages: (threadId: string, options?: { limit?: number; offset?: number }) => {
        const messages = mockMessages.get(threadId) || { sessions: [], hasMore: false, total: 0 };
        return Promise.resolve({
          success: true,
          data: messages,
        });
      },
    },
    agents: {
      getAvailableAgents: () => Promise.resolve({ success: true, data: [mockAgent] }),
      selectAgentForSession: () =>
        Promise.resolve({
          success: true,
          data: {
            agent: mockAgent,
            context: {
              agentSettings: {
                personality: 'friendly',
                responseStyle: 'balanced',
                detailLevel: 'medium',
              },
            } as AgentsAgentContext,
          },
        }),
      setAgentPersonality: () =>
        Promise.resolve({
          success: true,
          data: {
            personality: 'friendly' as string | undefined,
            responseStyle: 'balanced' as string | undefined,
            detailLevel: 'medium' as string | undefined,
          },
        }),
      setResponseStyle: () =>
        Promise.resolve({
          success: true,
          data: {
            personality: 'friendly' as string | undefined,
            responseStyle: 'balanced' as string | undefined,
            detailLevel: 'medium' as string | undefined,
          },
        }),
      getAgentCapabilities: () => Promise.resolve({ success: true, data: mockCapabilities }),
      tryAgentFeature: () => Promise.resolve({ success: true, data: mockFeatureDemo }),
    },
    knowledge: {
      ingestConcepts: (_params?: unknown) =>
        Promise.resolve({
          success: true,
          data: {
            conceptsInserted: 0,
            conceptsUpdated: 0,
            relationshipsInserted: 0,
            metadata: { processedAt: new Date().toISOString() },
          },
        }),
      exploreConcept: () =>
        Promise.resolve({
          success: true,
          data: {
            concept: { id: 'mock-concept', name: 'Mock Concept', category: 'general' },
            definition: 'Mock definition',
            keyPoints: [],
            relatedConcepts: [],
            examples: [],
            difficulty: 'basic',
            estimatedLearningTime: '5m',
            prerequisites: [],
            learningOutcomes: [],
          },
        }),
      getRelatedConcepts: () =>
        Promise.resolve({
          success: true,
          data: {
            conceptId: 'mock-concept',
            relatedConcepts: [],
            totalConnections: 0,
            strongestConnection: '',
            categories: [],
            learningPaths: [],
          },
        }),
      getKnowledgeMap: () =>
        Promise.resolve({
          success: true,
          data: {
            nodes: [],
            edges: [],
            layout: 'force-directed',
            clusters: [],
            metadata: { totalNodes: 0, totalEdges: 0, centerConcepts: [], learningPaths: [] },
          },
        }),
      searchKnowledge: () =>
        Promise.resolve({
          success: true,
          data: {
            query: 'mock',
            results: [],
            totalResults: 0,
            searchTime: '0ms',
            suggestions: [],
            filters: { categories: [], difficulties: [], types: [] },
          },
        }),
      parseConcepts: () =>
        Promise.resolve({
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
              inputFiles: 0,
              jobId: 'mock-job',
              segmentsProcessed: 0,
              segmentsTotal: 0,
              resumed: false,
            },
          },
        }),
      clearParsingJobs: () =>
        Promise.resolve({
          success: true,
          data: { removed: 0 },
        }),
    },
    settings: {
      getUserPreferences: () =>
        Promise.resolve({
          success: true,
          data: {
            profile: {
              name: 'Mock User',
              email: 'mock@example.com',
              avatar: '',
              timezone: 'UTC',
              bio: 'Mock bio',
              language: 'en',
              expertiseLevel: 'beginner',
              interests: [],
            },
            learning: {
              preferredDifficulty: 'beginner',
              dailyGoalMinutes: 30,
              weeklyGoalSessions: 5,
              preferredSessionDuration: '25min',
              preferredTopics: [],
              learningStyle: 'visual',
              enableReminders: true,
              reminderTime: '09:00',
              avoidedTopics: [],
              pace: 'balanced',
              enableProgressTracking: true,
              shareProgressPublicly: false,
              defaultAgentType: 'learning',
            },
            interface: {
              theme: 'light',
              fontSize: 'medium',
              fontFamily: 'system',
              enableAnimations: true,
              compactMode: false,
              showProgressIndicators: true,
              showKeyboardShortcuts: false,
              sidebarCollapsed: false,
              layout: 'default',
              colorScheme: 'light',
            },
            privacy: {
              shareAnalytics: false,
              saveConversationHistory: false,
              dataRetentionDays: 30,
              enableCrashReports: false,
              shareProgressStats: false,
              publicProfile: false,
              allowDataCollection: false,
              anonymizeUsage: true,
              cookieConsent: false,
              locationTracking: false,
            },
            notifications: {
              enableDesktopNotifications: true,
              enableEmailNotifications: true,
              enableInAppNotifications: true,
              learningReminders: true,
              achievementAlerts: true,
              weeklyProgress: true,
              streakReminders: false,
              newFeatures: true,
              systemNotifications: true,
              quietHours: {
                enabled: false,
                start: '22:00',
                end: '08:00',
              },
              frequency: 'daily',
            },
            accessibility: {
              highContrast: false,
              reducedMotion: false,
              screenReader: false,
              keyboardNavigation: true,
              focusIndicators: true,
              largeText: false,
              colorBlindSupport: false,
              dyslexiaFont: false,
              voiceControl: false,
              subtitles: false,
              captionStyle: 'default',
            },
            advanced: {
              developerMode: false,
              betaFeatures: false,
              debugMode: false,
              apiAccess: false,
              customProviders: false,
              exportData: true,
              integrations: {},
              experimentalFeatures: [],
              performanceMode: 'balanced',
              cacheSettings: {
                enableCache: true,
                cacheSize: '100MB',
                clearOnExit: false,
              },
            },
          },
        }),
      updatePreferences: () =>
        Promise.resolve({ success: true, data: { updatedSettings: {}, changes: [] } }),
      getAvailableProviders: () => {
        const mockProviders: ProviderConfig[] = [
          {
            providerType: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            apiKey: '',
          },
          {
            providerType: 'chatglm',
            baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
            models: ['glm-4', 'glm-3-turbo'],
            apiKey: '',
          },
        ];

        return Promise.resolve({
          success: true,
          data: {
            providers: mockProviders,
            summary: {
              total: mockProviders.length,
              connected: 0,
              configured: 0,
            },
          },
        });
      },
      configureProvider: () =>
        Promise.resolve({ success: true, data: { providerId: 'mock', status: 'configured' } }),
      getLearningSettings: () =>
        Promise.resolve({
          success: true,
          data: {
            goals: {
              dailyMinutes: 30,
              weeklySessions: 5,
              monthlyTopics: 5,
              quarterlyMilestones: [],
              yearlyObjectives: [],
              skillTargets: {},
              certificationGoals: [],
            },
            preferences: {
              difficulty: 'beginner',
              learningStyle: 'visual',
              pace: 'balanced',
              sessionLength: '25min',
              breakInterval: '15min',
              preferredTimes: ['morning', 'evening'],
              focusAreas: [],
              teachingMethod: 'discovery',
              feedbackFrequency: 'periodic',
            },
            notifications: {
              dailyReminders: true,
              reminderTime: '09:00',
              achievementAlerts: true,
              weeklyProgress: true,
              streakReminders: false,
              goalProgress: true,
              recommendedContent: true,
              reviewReminders: true,
              celebrationMessages: true,
              nudges: false,
            },
            tracking: {
              enableAnalytics: true,
              shareProgress: false,
              detailedLogging: true,
              exportData: false,
              retentionPeriod: 90,
              trackingLevel: 'basic',
              metrics: ['time', 'progress', 'completion'],
              reportFrequency: 'weekly',
            },
            recommendations: {
              enableRecommendations: true,
              recommendationSource: 'ai',
              difficultyAdaptation: true,
              interestBased: true,
              collaborativeFiltering: false,
              recommendationFrequency: 'daily',
              excludeTopics: [],
              preferredFormats: ['text', 'video'],
            },
            customization: {
              customLearningPaths: false,
              adaptiveDifficulty: true,
              personalizedContent: true,
              customGoals: false,
              customMetrics: [],
              integrationSettings: {},
              exportFormats: ['json', 'csv'],
              customPrompts: [],
            },
          },
        }),
      updateLearningSettings: () =>
        Promise.resolve({ success: true, data: { updatedSettings: {}, impact: [] } }),
      getConfig: () => Promise.resolve({ success: true, data: mockDefaultConfig }),
      setConfig: () => Promise.resolve({ success: true }),
    },
    content: {
      importLearningContent: (_fileList?: FileList) =>
        Promise.resolve({
          success: true,
          data: {
            summary: {
              difficulty: 'beginner',
              topics: [],
              concepts: [],
              estimatedTime: '5m',
            },
            processedFiles: 1,
            totalFiles: 1,
          },
        }),
    },
    getWorkspacePath: () => Promise.resolve({ success: true, data: '/mock/workspace' }),
    readDirectory: () => Promise.resolve({ success: true, data: [] }),
    readFile: () => Promise.resolve({ success: true, data: 'Mock file content' }),
    writeFile: () => Promise.resolve({ success: true, data: undefined }),
    existsFile: () => Promise.resolve({ success: true, data: false }),
    showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
    showSaveDialog: () => Promise.resolve({ canceled: true, filePath: '' }),
    onMenuAction: () => {
      return () => {};
    },
    onIPCError: () => () => {},
    getErrorBuffer: () => Promise.resolve([]),
    clearErrorBuffer: () => Promise.resolve({ cleared: true }),
    relaunchApp: () => Promise.resolve({ relaunching: false }),
    catalyst: {
      executeAgent: () =>
        Promise.resolve({
          success: true,
          data: {
            success: true,
            response: 'Mock result',
            metadata: { model: 'mock-model', tokensUsed: 0, processingTime: 0 },
          },
        }),
      executeAgentStream: () =>
        Promise.resolve({
          success: true,
          data: {
            success: true,
            response: 'Mock stream result',
            metadata: { model: 'mock-model', tokensUsed: 0, processingTime: 0 },
          },
        }),
      cancelAgent: () => Promise.resolve({ success: true, data: { cancelled: true } }),
      getAgentStatus: () =>
        Promise.resolve({
          success: true,
          data: {
            found: true,
            execution: {
              id: 'mock-execution',
              status: 'completed',
              agentId: 'mock-agent',
              startTime: Date.now() - 1000,
              endTime: Date.now(),
              progress: 100,
              result: 'Mock result',
            },
          },
        }),
      registerAgent: () => Promise.resolve({ success: true, data: { agentId: 'mock-agent' } }),
      unregisterAgent: () =>
        Promise.resolve({ success: true, data: { unregistered: 'mock-agent' } }),
      sendChat: () =>
        Promise.resolve({ success: true, data: { success: true, response: 'Mock response' } }),
      sendChatStream: () => Promise.resolve({ success: true, data: { success: true } }),
      getSession: () =>
        Promise.resolve({
          success: true,
          data: { success: true, session: { id: 'mock-session', status: 'active' } },
        }),
      cancelExecution: () => Promise.resolve({ success: true, data: { success: true } }),
    },
    handleError: () => {},
    healthCheck: () => Promise.resolve({ success: true, data: { status: 'healthy', apis: {} } }),
    getVersion: () =>
      Promise.resolve({ success: true, data: { version: '1.0.0', build: 'mock', platform: 'web' } }),
    trackEvent: () => Promise.resolve({ success: true, data: undefined }),
  };

  return createElectronAPIClientWith(partial);
}

export function createElectronAPIClientWith(implementation: Partial<ElectronAPI>): ElectronAPI {
  return implementation as ElectronAPI;
}
const mockDefaultConfig: AppConfig = {
  ai: {
    providers: {},
    modelTypes: {},
    embeddingDimensions: 1536,
  },
  ui: {
    theme: 'light',
    showTokenUsage: false,
    displayFormat: 'detailed',
    sessionDuration: 25,
    fontSize: 'medium',
    sidebarWidth: 300,
    autoSave: true,
    autoScroll: true,
    showLineNumbers: false,
    enableMarkdown: true,
    enableSyntaxHighlighting: true,
    compactMode: false,
  },
  learning: {
    autoSave: true,
    sessionTimeoutMinutes: 60,
    difficulty: 'intermediate',
    learningStyle: 'visual',
    personalizationEnabled: true,
    checkpointInterval: 15,
    maxSessionHistory: 100,
    enableAnalytics: false,
    preferredExplanationLength: 'detailed',
  },
  privacy: {
    storeConversations: true,
    retentionDays: 90,
    anonymousAnalytics: false,
    crashReporting: true,
    encryptLocalStorage: false,
    autoCleanup: true,
    exportFormat: 'json',
  },
  performance: {
    cacheSizeMb: 100,
    enableCaching: true,
    maxConcurrentRequests: 5,
    requestTimeout: 30,
    memoryLimitMb: 512,
    gpuAcceleration: false,
    backgroundProcessing: true,
    preloadModels: false,
  },
};
