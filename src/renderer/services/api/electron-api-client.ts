import type { ElectronAPI, AppConfig } from '@/shared/types';
import type {
  AgentDisplay,
  AgentContext,
  AgentCapabilitiesDisplay,
  FeatureDemoDisplay,
} from '@/shared/types';
import type { ProviderConfig } from '@/shared/types';

type ElectronWindow = Window & { electronAPI?: ElectronAPI };

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

const mockAgent: AgentDisplay = {
  id: 'agent_mock',
  type: 'learning',
  name: 'Mock Agent',
  description: 'Test agent',
  avatar: '',
  color: '#10b981',
  capabilities: ['explanation', 'practice'],
  isAvailable: true,
  category: 'mock',
  stats: agentStats,
  specialties: ['mocking'],
  languages: ['en'],
  difficulty: 'beginner',
  interactive: true,
};

const mockAgentContext: AgentContext = {
  sessionId: 'mock-session',
  agentId: mockAgent.id,
  agentSettings: {
    agentId: mockAgent.id,
    personality: 'friendly encouraging',
    responseStyle: {
      detailLevel: 'balanced',
      includeExamples: true,
      useAnalogies: false,
      provideStepByStep: false,
      language: 'en',
      technicalDepth: 'beginner',
    },
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

const mockCapabilities: AgentCapabilitiesDisplay = {
  agentId: mockAgent.id,
  capabilities: [],
  overallStrengths: [],
  idealUseCases: [],
  limitations: [],
  performanceMetrics: {
    accuracy: 0,
    responseTime: '0ms',
    userSatisfaction: 0,
  },
  supportedFeatures: [],
  integrationPartners: [],
};

const mockFeatureDemo: FeatureDemoDisplay = {
  agentId: mockAgent.id,
  feature: 'mock-feature',
  demoType: 'example',
  description: 'Mock feature demo',
  samplePrompts: [],
  demoInteraction: {
    type: 'guided_example',
    steps: [],
  },
  expectedOutcome: 'Mock outcome',
  estimatedTime: '0m',
  difficulty: 'easy',
};

export function createMockElectronAPIClient(): ElectronAPI {
  const mockStreamState = new Map<string, { aborted: boolean }>();
  const partial: Partial<ElectronAPI> = {
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
      list: () =>
        Promise.resolve({
          success: true,
          data: { sessions: [], total: 0, hasMore: false },
        }),
      create: () =>
        Promise.resolve({
          success: true,
          data: { sessionId: 'test-session-id' },
        }),
      get: () =>
        Promise.resolve({
          success: true,
          data: {
            id: 'mock-session',
            title: 'Mock Session',
            topic: 'mock-topic',
            difficulty: 'beginner',
            status: 'active',
            progress: 0,
            agent: mockAgent,
            lastActivity: new Date().toISOString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            duration: '0m',
            messageCount: 0,
            conceptsExplored: [],
            masteryLevel: 0,
            tags: [],
            summary: 'Mock session summary',
          },
        }),
      update: () =>
        Promise.resolve({
          success: true,
          data: {
            id: 'mock-session',
            title: 'Mock Session',
            topic: 'mock-topic',
            difficulty: 'beginner',
            status: 'active',
            progress: 0,
            agent: mockAgent,
            lastActivity: new Date().toISOString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            duration: '0m',
            messageCount: 0,
            conceptsExplored: [],
            masteryLevel: 0,
            tags: [],
            summary: 'Mock session summary',
          },
        }),
      delete: () => Promise.resolve({ success: true, data: { deleted: true } }),
      saveMessage: () => Promise.resolve({ success: true, data: undefined }),
      saveSessionWithMessages: () =>
        Promise.resolve({ success: true, data: { sessionId: 'test-session-id' } }),
      updateTitle: () => Promise.resolve({ success: true, data: undefined }),
      getRecentSessions: () => Promise.resolve({ success: true, data: [] }),
      search: () =>
        Promise.resolve({
          success: true,
          data: { sessions: [], total: 0, query: '', hasMore: false },
        }),
      getStatistics: () =>
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
    },
    chat: {
      startConversation: () =>
        Promise.resolve({
          success: true,
          data: {
            id: 'mock-conversation',
            agent: mockAgent,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            suggestedTopics: [],
          },
        }),
      sendMessage: () =>
        Promise.resolve({
          success: true,
          data: {
            id: 'mock-message',
            conversationId: 'mock-conversation',
            role: 'assistant',
            content: 'Mock response',
            status: 'completed',
            timestamp: new Date().toISOString(),
            relativeTime: 'just now',
          },
        }),
      sendMessageStream: (
        params: { conversationId: string; message: string; attachments?: File[] },
        onEvent: (evt: { type: 'chunk' | 'complete' | 'error'; chunk?: string; error?: string }) => void,
      ) => {
        const text = params.message || 'Mock stream response';
        const chunks = text.match(/.{1,60}/g) ?? [text];
        mockStreamState.set(params.conversationId, { aborted: false });
        const state = mockStreamState.get(params.conversationId)!;
        let i = 0;
        const emitNext = () => {
          try {
            if (!state || state.aborted) return;
            if (i < chunks.length) {
              onEvent({ type: 'chunk', chunk: chunks[i] });
              i++;
              setTimeout(emitNext, 100);
            } else {
              onEvent({ type: 'complete' });
            }
          } catch (err) {
            onEvent({ type: 'error', error: (err as Error)?.message || 'Mock stream error' });
          }
        };
        setTimeout(emitNext, 80);
        return Promise.resolve({ success: true, data: { started: true } });
      },
      cancelStream: (conversationId: string) => {
        const state = mockStreamState.get(conversationId);
        if (state) state.aborted = true;
        return Promise.resolve({ success: true, data: { canceled: true } });
      },
      getTypingIndicator: () =>
        Promise.resolve({
          success: true,
          data: {
            isTyping: false,
            agentInfo: { name: mockAgent.name, avatar: mockAgent.avatar, color: mockAgent.color },
          },
        }),
      getConversationHistory: () =>
        Promise.resolve({
          success: true,
          data: {
            conversationId: 'mock-conversation',
            messages: [],
            pagination: { hasMore: false, total: 0 },
          },
        }),
      pauseConversation: () =>
        Promise.resolve({ success: true, data: { message: 'Conversation paused' } }),
      resumeConversation: () =>
        Promise.resolve({
          success: true,
          data: {
            conversationId: 'mock-conversation',
            lastMessage: {} as any,
            agentState: { currentTopic: undefined, contextPoints: [], userPreferences: {} },
            suggestedReopenings: [],
          },
        }),
      endConversation: () =>
        Promise.resolve({
          success: true,
          data: {
            conversationId: 'mock-conversation',
            summary: 'Mock conversation summary',
            keyTopics: [],
            duration: '0m',
            messageCount: 0,
            suggestedFollowUps: [],
          },
        }),
      checkPracticeOpportunity: () =>
        Promise.resolve({
          success: true,
          data: {
            hasOpportunity: false,
            shouldSuggest: false,
            reason: 'No practice opportunity detected',
            timing: 'not-appropriate',
            confidence: 0,
          },
        }),
      getPracticeSuggestion: () =>
        Promise.resolve({
          success: true,
          data: {
            id: 'mock-suggestion',
            type: 'gentle-nudge',
            introduction: 'Would you like to practice?',
            challenge: 'Try this exercise',
            context: 'Based on our conversation',
            estimatedTime: 5,
            difficulty: 'easy',
            vibe: 'understanding',
            timing: { when: 'right now', urgency: 'low' },
            options: {
              accept: "Yes, let's practice!",
              decline: 'Not right now',
              postpone: 'Maybe later',
            },
            metadata: {
              concept: 'mock-concept',
              relatedTopics: [],
              prerequisites: [],
              nextSteps: [],
            },
          },
        }),
    },
    agents: {
      getAvailableAgents: () => Promise.resolve({ success: true, data: [mockAgent] }),
      selectAgentForSession: () =>
        Promise.resolve({ success: true, data: { agent: mockAgent, context: mockAgentContext } }),
      setAgentPersonality: () =>
        Promise.resolve({ success: true, data: mockAgentContext.agentSettings }),
      setResponseStyle: () =>
        Promise.resolve({
          success: true,
          data: {
            detailLevel: 'balanced',
            includeExamples: true,
            useAnalogies: false,
            provideStepByStep: false,
            language: 'en',
            technicalDepth: 'beginner',
            responseLength: 'medium',
            formalityLevel: 'casual',
            useVisualAids: true,
            provideCodeExamples: true,
          },
        }),
      getAgentCapabilities: () => Promise.resolve({ success: true, data: mockCapabilities }),
      tryAgentFeature: () => Promise.resolve({ success: true, data: mockFeatureDemo }),
    },
    knowledge: {
      ingestConcepts: () =>
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
            },
          },
        }),
    },
    content: {
      exploreLocalProjects: () => Promise.resolve({ success: true, data: [] }),
      importLearningContent: () =>
        Promise.resolve({
          success: true,
          data: {
            success: true,
            processedFiles: 0,
            totalFiles: 0,
            extractedContent: {
              concepts: [],
              codeExamples: 0,
              documentation: 0,
              exercises: 0,
              images: 0,
            },
            importedSessions: [],
            recommendations: [],
            errors: [],
            summary: {
              learningValue: 'medium',
              estimatedTime: '30m',
              keyTopics: [],
              difficulty: 'beginner',
            },
          },
        }),
      getRecommendedContent: () => Promise.resolve({ success: true, data: [] }),
      searchLearningResources: () =>
        Promise.resolve({
          success: true,
          data: {
            query: '',
            totalResults: 0,
            results: [],
            filters: { types: [], difficulties: [], sources: [], formats: [], languages: [] },
            appliedFilters: {},
            suggestions: [],
            pagination: { hasMore: false, nextCursor: undefined, limit: 10 },
            searchTime: '0ms',
            relatedQueries: [],
          },
        }),
      extractConcepts: () => Promise.resolve({ success: true, data: [] }),
      analyzeDocument: () =>
        Promise.resolve({
          success: true,
          data: {
            filePath: '/mock/path/document.pdf',
            fileName: 'document.pdf',
            fileType: 'pdf',
            fileSize: '1024',
            analysis: {
              readabilityScore: 85,
              technicalComplexity: 'beginner',
              estimatedReadingTime: '5m',
              learningValue: 'medium',
              structure: {
                sections: 5,
                codeExamples: 2,
                diagrams: 1,
                exercises: 3,
                references: 10,
              },
              quality: {
                completeness: 85,
                accuracy: 90,
                clarity: 88,
                organization: 87,
              },
            },
            extractedConcepts: [],
            learningObjectives: [],
            suggestedUse: 'Mock suggested use',
            prerequisites: [],
            topics: ['mock-topic'],
            difficulty: 'beginner',
            estimatedLearningTime: '30m',
            relatedDocuments: [],
            tags: ['mock-tag'],
          },
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
      getAppVersion: () => Promise.resolve({ success: true, data: '1.0.0' }),
      quit: () => Promise.resolve({ success: true }),
      getConfig: () => Promise.resolve({ success: true, data: mockDefaultConfig }),
      setConfig: () => Promise.resolve({ success: true }),
    },
    getWorkspacePath: () => Promise.resolve('/mock/workspace'),
    readDirectory: () => Promise.resolve([]),
    readFile: () => Promise.resolve('Mock file content'),
    writeFile: () => Promise.resolve(),
    existsFile: () => Promise.resolve(false),
    showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
    showSaveDialog: () => Promise.resolve({ canceled: true, filePath: '' }),
    onMenuAction: () => {},
    onIPCError: () => () => {},
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
      listAgents: () => Promise.resolve({ success: true, data: [mockAgent] }),
      getActiveExecutions: () => Promise.resolve({ success: true, data: [] }),
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
    healthCheck: () => Promise.resolve({ status: 'healthy', apis: {} }),
    getVersion: () => Promise.resolve({ version: '1.0.0', build: 'mock', platform: 'web' }),
    trackEvent: () => Promise.resolve(),
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
