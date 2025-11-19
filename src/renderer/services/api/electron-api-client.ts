import type { ElectronAPI } from '@/shared/types/electron-api';
import type { DashboardDisplay } from '@/shared/interfaces/analytics.interface';
import type {
  AgentDisplay,
  AgentContext,
  AgentCapabilitiesDisplay,
  FeatureDemoDisplay
} from '@/shared/types/electron-api/agent-api';

export type ElectronAPIClient = ElectronAPI;

type ElectronWindow = Window & { electronAPI?: ElectronAPI };

export function createElectronAPIClient(): ElectronAPIClient {
  const electronAPI = (window as ElectronWindow).electronAPI;
  if (electronAPI === undefined) {
    console.warn('Electron API not available. Using mock client for browser environment.');
    return createMockElectronAPIClient();
  }
  return electronAPI;
}

const agentStats = { totalSessions: 0, avgRating: 0, sessionsCount: 0 };

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
  interactive: true
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
      technicalDepth: 'beginner'
    },
    interaction: {
      enableFollowUpQuestions: true,
      proactiveSuggestions: true,
      encouragementLevel: 'moderate',
      humorLevel: 'light'
    },
    preferences: {
      responseLength: 'medium',
      formalityLevel: 'casual',
      useEmojis: true
    }
  },
  sessionHistory: {
    previousSessions: 0,
    avgRating: 0,
    totalInteractionTime: '0m'
  },
  personalizedSettings: {
    preferredTopics: [],
    avoidedTopics: [],
    communicationStyle: 'casual',
    pacePreference: 'medium'
  },
  initialContext: []
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
    userSatisfaction: 0
  },
  supportedFeatures: [],
  integrationPartners: []
};

const mockFeatureDemo: FeatureDemoDisplay = {
  agentId: mockAgent.id,
  feature: 'mock-feature',
  demoType: 'example',
  description: 'Mock feature demo',
  samplePrompts: [],
  demoInteraction: {
    type: 'guided_example',
    steps: []
  },
  expectedOutcome: 'Mock outcome',
  estimatedTime: '0m',
  difficulty: 'easy'
};

export function createMockElectronAPIClient(): ElectronAPIClient {
  const partial: Partial<ElectronAPI> = {
    analytics: {
      getDashboard: () => Promise.resolve({
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
            streakHistory: []
          },
          timeStats: {
            totalStudyTime: 0,
            averageSessionTime: 0,
            totalSessions: 0,
            mostProductiveHour: 9,
            studyDaysThisMonth: 0,
            studyDaysThisWeek: 0
          }
        }
      }),
      getProgressChart: () => Promise.resolve({
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
            bestDay: 'Monday'
          },
          insights: []
        }
      }),
      getAchievements: () => Promise.resolve({ success: true, data: [] }),
      unlockAchievement: () => Promise.resolve({
        success: true,
        data: {
          type: 'badge',
          value: 'mock-achievement',
          description: 'Mock achievement unlocked',
          icon: 'mock-icon'
        }
      }),
      getUsageStats: () => Promise.resolve({
        success: true,
        data: {
          timeRange: '7days',
          sessions: {
            total: 0,
            averagePerDay: 0,
            averageDuration: '0m',
            completionRate: 0,
            mostProductiveTime: 'morning',
            mostProductiveDay: 'Monday'
          },
          learning: {
            conceptsLearned: 0,
            skillsImproved: [],
            topicsExplored: 0,
            exercisesCompleted: 0,
            accuracy: 0
          },
          engagement: {
            activeDays: 0,
            consistencyStreak: 0,
            averageSessionRating: 0,
            featureUsage: {},
            dropOffPoints: []
          },
          patterns: {
            peakHours: [],
            preferredTopics: [],
            learningStyle: 'visual',
            sessionLengthPreference: 'medium',
            improvementAreas: []
          }
        }
      }),
      getTokenUsage: () => Promise.resolve({
        success: true,
        data: {
          timeRange: '7days',
          usage: {
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            averageTokensPerSession: 0,
            peakUsageDay: 'Monday'
          },
          cost: {
            totalCost: '$0.00',
            averageCostPerSession: '$0.00',
            costPerToken: '$0.00',
            projectedMonthlyCost: '$0.00'
          },
          byProvider: [],
          byFeature: [],
          trends: {
            usageTrend: 'stable',
            costTrend: 'stable',
            efficiencyTrend: 'stable'
          },
          recommendations: []
        }
      }),
      checkAchievements: () => Promise.resolve({ success: true, data: [] }),
      trackSession: () => Promise.resolve({ success: true, data: 'test-session-id' }),
      getConceptProgress: () => Promise.resolve({
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
          nextSteps: []
        }
      }),
      updateConceptProgress: () => Promise.resolve({ success: true }),
      getSessionHistory: () => Promise.resolve({ success: true, data: [] }),
      getLearningTrends: () => Promise.resolve({
        success: true,
        data: {
          period: 'daily',
          dataPoints: [],
          average: 0,
          peak: 0,
          improvement: 0
        }
      }),
      getStudyStreak: () => Promise.resolve({
        success: true,
        data: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: new Date(),
          streakHistory: []
        }
      }),
      getTimeStats: () => Promise.resolve({
        success: true,
        data: {
          totalStudyTime: 0,
          averageSessionTime: 0,
          totalSessions: 0,
          mostProductiveHour: 9,
          studyDaysThisMonth: 0,
          studyDaysThisWeek: 0
        }
      }),
      exportData: () => Promise.resolve({ success: true, data: '{}' }),
      importData: () => Promise.resolve({ success: true })
    },
    sessions: {
      list: () => Promise.resolve({ success: true, sessions: [], total: 0, hasMore: false }),
      create: () => Promise.resolve({ success: true, sessionId: 'test-session-id' }),
      get: () => Promise.resolve({
        success: true,
        session: {
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
          summary: 'Mock session summary'
        }
      }),
      update: () => Promise.resolve({
        success: true,
        session: {
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
          summary: 'Mock session summary'
        }
      }),
      delete: () => Promise.resolve({ success: true, deleted: true }),
      saveMessage: () => Promise.resolve({ success: true }),
      saveSessionWithMessages: () => Promise.resolve({ success: true, sessionId: 'test-session-id' }),
      updateTitle: () => Promise.resolve({ success: true }),
      getRecentSessions: () => Promise.resolve({ success: true, sessions: [] }),
      search: () => Promise.resolve({ success: true, results: { sessions: [], total: 0, query: '', hasMore: false } }),
      getStatistics: () => Promise.resolve({
        success: true,
        statistics: {
          totalSessions: 0,
          totalMessages: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          totalTokensUsed: 0,
          averageMessagesPerSession: 0
        }
      })
    },
    chat: {
      startConversation: () => Promise.resolve({
        id: 'mock-conversation',
        agent: mockAgent,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        suggestedTopics: []
      }),
      sendMessage: () => Promise.resolve({
        id: 'mock-message',
        conversationId: 'mock-conversation',
        role: 'assistant',
        content: 'Mock response',
        status: 'completed',
        timestamp: new Date().toISOString(),
        relativeTime: 'just now'
      }),
      sendMessageStream: () => Promise.resolve((async function* () { yield 'Mock stream response' })()),
      getTypingIndicator: () => Promise.resolve({ isTyping: false, agentInfo: { name: mockAgent.name, avatar: mockAgent.avatar, color: mockAgent.color } }),
      getConversationHistory: () => Promise.resolve({ conversationId: 'mock-conversation', messages: [], pagination: { hasMore: false, total: 0 } }),
      pauseConversation: () => Promise.resolve({ success: true, message: 'Conversation paused' }),
      resumeConversation: () => Promise.resolve({ success: true, context: { conversationId: 'mock-conversation', lastMessage: {} as any, agentState: { currentTopic: undefined, contextPoints: [], userPreferences: {} }, suggestedReopenings: [] } }),
      endConversation: () => Promise.resolve({ conversationId: 'mock-conversation', summary: 'Mock conversation summary', keyTopics: [], duration: '0m', messageCount: 0, suggestedFollowUps: [] }),
      checkPracticeOpportunity: () => Promise.resolve({ hasOpportunity: false, shouldSuggest: false, reason: 'No practice opportunity detected', timing: 'not-appropriate', confidence: 0 }),
      getPracticeSuggestion: () => Promise.resolve({ id: 'mock-suggestion', type: 'gentle-nudge', introduction: 'Would you like to practice?', challenge: 'Try this exercise', context: 'Based on our conversation', estimatedTime: 5, difficulty: 'easy', vibe: 'understanding', timing: { when: 'right now', urgency: 'low' }, options: { accept: 'Yes, let\'s practice!', decline: 'Not right now', postpone: 'Maybe later' }, metadata: { concept: 'mock-concept', relatedTopics: [], prerequisites: [], nextSteps: [] } })
    },
    agents: {
      getAvailableAgents: () => Promise.resolve([mockAgent]),
      selectAgentForSession: () => Promise.resolve({ success: true, agent: mockAgent, context: mockAgentContext }),
      setAgentPersonality: () => Promise.resolve({ success: true, updatedSettings: mockAgentContext.agentSettings }),
      setResponseStyle: () => Promise.resolve({
        success: true,
        appliedSettings: {
          detailLevel: 'balanced',
          includeExamples: true,
          useAnalogies: false,
          provideStepByStep: false,
          language: 'en',
          technicalDepth: 'beginner',
          responseLength: 'medium',
          formalityLevel: 'casual',
          useVisualAids: true,
          provideCodeExamples: true
        }
      }),
      getAgentCapabilities: () => Promise.resolve(mockCapabilities),
      tryAgentFeature: () => Promise.resolve(mockFeatureDemo)
    },
    knowledge: {
      ingestConcepts: () => Promise.resolve({ conceptsInserted: 0, conceptsUpdated: 0, relationshipsInserted: 0, metadata: { processedAt: new Date().toISOString() } }),
      exploreConcept: () => Promise.resolve({ concept: { id: 'mock-concept', name: 'Mock Concept', category: 'general' }, definition: 'Mock definition', keyPoints: [], relatedConcepts: [], examples: [], difficulty: 'basic', estimatedLearningTime: '5m', prerequisites: [], learningOutcomes: [] }),
      getRelatedConcepts: () => Promise.resolve({ conceptId: 'mock-concept', relatedConcepts: [], totalConnections: 0, strongestConnection: '', categories: [], learningPaths: [] }),
      getKnowledgeMap: () => Promise.resolve({ nodes: [], edges: [], layout: 'force-directed', clusters: [], metadata: { totalNodes: 0, totalEdges: 0, centerConcepts: [], learningPaths: [] } }),
      searchKnowledge: () => Promise.resolve({ query: 'mock', results: [], totalResults: 0, searchTime: '0ms', suggestions: [], filters: { categories: [], difficulties: [], types: [] } }),
      parseConcepts: () => Promise.resolve({
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
          modelUsage: {}
        },
        errors: [],
        metadata: {
          processingTime: 0,
          processedAt: new Date().toISOString(),
          inputFiles: 0
        }
      })
    },
    content: {
      exploreLocalProjects: () => Promise.resolve([]),
      importLearningContent: () => Promise.resolve({ success: true, processedFiles: 0, totalFiles: 0, extractedContent: { concepts: [], codeExamples: 0, documentation: 0, exercises: 0, images: 0 }, errors: [], warnings: [], importedSessions: [], recommendations: [], summary: { learningValue: 'medium', estimatedTime: '30m', keyTopics: [], difficulty: 'beginner' }, metadata: { processingTime: 0, processedAt: new Date().toISOString(), inputFiles: 0 } }),
      getRecommendedContent: () => Promise.resolve([]),
      searchLearningResources: () => Promise.resolve({ results: [], filters: { types: [], difficulties: [], sources: [], formats: [], languages: [] }, appliedFilters: {}, suggestions: [], totalResults: 0, query: '', searchTime: '0ms', pagination: { page: 1, limit: 10, hasMore: false }, relatedQueries: [] }),
      extractConcepts: () => Promise.resolve([]),
      analyzeDocument: () => Promise.resolve({
        documentId: 'mock-doc',
        filePath: '/mock/path/document.pdf',
        fileName: 'document.pdf',
        fileType: 'pdf',
        fileSize: '1024',
        analysis: {
          summary: 'Mock analysis',
          keyPoints: [],
          difficulty: 'beginner',
          estimatedReadingTime: '5m',
          topics: [],
          concepts: [],
          readabilityScore: 85,
          technicalComplexity: 'beginner',
          learningValue: 'medium',
          structure: {
            sections: 5,
            codeExamples: 2,
            diagrams: 1,
            exercises: 3,
            references: 10
          },
          quality: {
            accuracy: 90,
            completeness: 85,
            clarity: 88,
            relevance: 92,
            organization: 87
          }
        },
        extractedConcepts: [],
        learningObjectives: [],
        suggestedUse: 'Mock suggested use',
        prerequisites: [],
        relatedTopics: [],
        difficultyAssessment: 'beginner',
        estimatedStudyTime: '30m',
        interactiveElements: [],
        topics: ['mock-topic'],
        difficulty: 'beginner',
        estimatedLearningTime: '30m',
        relatedDocuments: [],
        tags: ['mock-tag'],
        metadata: {
          processedAt: new Date().toISOString(),
          uploadedAt: new Date().toISOString(),
          version: '1.0',
          language: 'en',
          pageCount: 10,
          wordCount: 1000,
          lastModified: new Date().toISOString(),
          checksum: 'mock-checksum'
        }
      }),
    },
    settings: {
      getUserPreferences: () => Promise.resolve({
        profile: {
          name: 'Mock User',
          email: 'mock@example.com',
          avatar: '',
          timezone: 'UTC',
          bio: 'Mock bio',
          language: 'en',
          expertiseLevel: 'beginner',
          interests: []
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
          defaultAgentType: 'learning'
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
          colorScheme: 'light'
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
          locationTracking: false
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
            end: '08:00'
          },
          frequency: 'daily'
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
          captionStyle: 'default'
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
            clearOnExit: false
          }
        }
      }),
      updatePreferences: () => Promise.resolve({ success: true, updatedSettings: {}, changes: [] }),
      getAvailableProviders: () => Promise.resolve([]),
      configureProvider: () => Promise.resolve({ success: true, providerId: 'mock-provider', status: 'configured' }),
      getLearningSettings: () => Promise.resolve({
        goals: {
          dailyMinutes: 30,
          weeklySessions: 5,
          monthlyTopics: 5,
          quarterlyMilestones: [],
          yearlyObjectives: [],
          skillTargets: {},
          certificationGoals: []
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
          feedbackFrequency: 'periodic'
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
          nudges: false
        },
        tracking: {
          enableAnalytics: true,
          shareProgress: false,
          detailedLogging: true,
          exportData: false,
          retentionPeriod: 90,
          trackingLevel: 'basic',
          metrics: ['time', 'progress', 'completion'],
          reportFrequency: 'weekly'
        },
        recommendations: {
          enableRecommendations: true,
          recommendationSource: 'ai',
          difficultyAdaptation: true,
          interestBased: true,
          collaborativeFiltering: false,
          recommendationFrequency: 'daily',
          excludeTopics: [],
          preferredFormats: ['text', 'video']
        },
        customization: {
          customLearningPaths: false,
          adaptiveDifficulty: true,
          personalizedContent: true,
          customGoals: false,
          customMetrics: [],
          integrationSettings: {},
          exportFormats: ['json', 'csv'],
          customPrompts: []
        }
      }),
      updateLearningSettings: () => Promise.resolve({ success: true, updatedSettings: {}, impact: [] }),
      getAppVersion: () => Promise.resolve('1.0.0'),
      quit: () => Promise.resolve(),
      getConfig: () => Promise.resolve(null),
      setConfig: () => Promise.resolve()
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
      executeAgent: () => Promise.resolve({ success: true, result: 'Mock result' }),
      executeAgentStream: () => Promise.resolve({
        success: true,
        result: 'Mock stream result',
        metadata: {
          model: 'mock-model',
          tokensUsed: 0,
          processingTime: 0
        }
      }),
      cancelAgent: () => Promise.resolve({ success: true }),
      getAgentStatus: () => Promise.resolve({
        status: 'idle',
        agentId: 'mock-agent',
        found: true,
        lastActivity: new Date().toISOString()
      }),
      listAgents: () => Promise.resolve([mockAgent]),
      getActiveExecutions: () => Promise.resolve([]),
      registerAgent: () => Promise.resolve({ success: true, agentId: 'mock-agent' }),
      unregisterAgent: () => Promise.resolve({ success: true }),
      sendChat: () => Promise.resolve({ success: true, response: 'Mock response' }),
      sendChatStream: () => Promise.resolve({ success: true, data: (async function* () { yield 'Mock stream response' })() }),
      getSession: () => Promise.resolve({ success: true, data: { sessionId: 'mock-session', status: 'active', agent: mockAgent, startTime: new Date().toISOString() } }),
      cancelExecution: () => Promise.resolve({ success: true })
    },
    handleError: () => {},
    healthCheck: () => Promise.resolve({ status: 'healthy', apis: {} }),
    getVersion: () => Promise.resolve({ version: '1.0.0', build: 'mock', platform: 'web' }),
    trackEvent: () => Promise.resolve()
  };

  return createElectronAPIClientWith(partial);
}

export function createElectronAPIClientWith(
  implementation: Partial<ElectronAPI>
): ElectronAPIClient {
  return implementation as ElectronAPI;
}
