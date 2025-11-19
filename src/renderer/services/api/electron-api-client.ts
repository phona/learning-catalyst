import type { ElectronAPI } from '@/shared/types/electron-api';
import type {
  AgentDisplay,
  AgentContext,
  ResponseStyleSettings,
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

const agentStats = { totalSessions: 0, avgRating: 0 };

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
      getDashboard: () => Promise.resolve({ success: true, data: {} }),
      getProgressChart: () => Promise.resolve({ success: true, data: {} }),
      getAchievements: () => Promise.resolve({ success: true, data: [] }),
      trackSession: () => Promise.resolve({ success: true, data: 'test-session-id' }),
      getConceptProgress: () => Promise.resolve({ success: true, data: {} }),
      updateConceptProgress: () => Promise.resolve({ success: true }),
      getSessionHistory: () => Promise.resolve({ success: true, data: [] }),
      getLearningTrends: () => Promise.resolve({ success: true, data: {} }),
      getStudyStreak: () => Promise.resolve({ success: true, data: {} }),
      getTimeStats: () => Promise.resolve({ success: true, data: {} }),
      exportData: () => Promise.resolve({ success: true, data: '{}' }),
      importData: () => Promise.resolve({ success: true })
    },
    sessions: {
      saveSessionWithMessages: () => Promise.resolve({ success: true, sessionId: 'test-session-id' }),
      saveMessage: () => Promise.resolve({ success: true }),
      updateTitle: () => Promise.resolve({ success: true }),
      getRecentSessions: () => Promise.resolve({ success: true, sessions: [] }),
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
      }),
      list: () => Promise.resolve({ success: true, sessions: [], total: 0, hasMore: false })
    },
    chat: {
      send: () => Promise.resolve({ success: true, messageId: 'test-message-id' }),
      sendStream: () => Promise.resolve({}),
      getSession: () => Promise.resolve({ success: true, session: {}, messages: [] }),
      getStatus: () => Promise.resolve({ success: true, isTyping: false })
    },
    agents: {
      list: () => Promise.resolve({ success: true, agents: [mockAgent] }),
      selectAgentForSession: () => Promise.resolve({ success: true, agent: mockAgent, context: mockAgentContext }),
      setAgentPersonality: () => Promise.resolve({
        success: true,
        updatedSettings: mockAgentContext.agentSettings
      }),
      setResponseStyle: () => Promise.resolve({
        success: true,
        appliedSettings: mockAgentContext.agentSettings.responseStyle as ResponseStyleSettings
      }),
      getAgentCapabilities: () => Promise.resolve({ success: true, agentCapabilities: mockCapabilities }),
      tryAgentFeature: () => Promise.resolve({ success: true, featureDemo: mockFeatureDemo })
    },
    knowledge: {
      parseConcepts: () => Promise.resolve({
        success: true,
        concepts: [],
        relationships: [],
        statistics: { totalConcepts: 0, extractedFiles: 0, processingTime: 0 },
        errors: []
      })
    }
  };

  return createElectronAPIClientWith(partial);
}

export function createElectronAPIClientWith(
  implementation: Partial<ElectronAPI>
): ElectronAPIClient {
  return implementation as ElectronAPI;
}
