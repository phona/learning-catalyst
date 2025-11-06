/**
 * Agent Management API
 *
 * Manages AI agent selection, configuration, and interaction preferences.
 * Focuses on personalizing the AI learning experience.
 */

export interface AgentsAPI {
  /**
   * Gets all available AI agents with display information
   * Returns agents optimized for selection UI
   * @returns Promise<AgentDisplay[]> - Array of available agents
   */
  getAvailableAgents: () => Promise<AgentDisplay[]>;

  /**
   * Selects an agent for a specific session
   * Associates the agent with the session and applies preferences
   * @param params.sessionId - Learning session ID
   * @param params.agentType - Type of agent to select
   * @returns Promise<{ success: boolean; agent: AgentDisplay; context: AgentContext }>
   */
  selectAgentForSession: (params: {
    sessionId: string;
    agentType: string;
  }) => Promise<{ success: boolean; agent: AgentDisplay; context: AgentContext }>;

  /**
   * Sets personality preferences for an agent
   * Customizes how the agent interacts and responds
   * @param params.agentId - Agent ID to configure
   * @param params.personality - Personality description ('friendly encouraging', 'formal professional', 'casual friendly')
   * @returns Promise<{ success: boolean; updatedSettings: AgentSettings }>
   */
  setAgentPersonality: (params: {
    agentId: string;
    personality: 'friendly encouraging' | 'formal professional' | 'casual friendly' | 'technical expert';
  }) => Promise<{ success: boolean; updatedSettings: AgentSettings }>;

  /**
   * Sets response style preferences for a session
   * Controls the format and depth of agent responses
   * @param params.sessionId - Session ID to apply settings to
   * @param params.style - Response style configuration
   * @returns Promise<{ success: boolean; appliedSettings: ResponseStyleSettings }>
   */
  setResponseStyle: (params: {
    sessionId: string;
    style: ResponseStyleSettings;
  }) => Promise<{ success: boolean; appliedSettings: ResponseStyleSettings }>;

  /**
   * Gets detailed capabilities for a specific agent
   * Useful for showcasing agent features and limitations
   * @param agentId - Agent ID to get capabilities for
   * @returns Promise<AgentCapabilitiesDisplay> - Detailed capability information
   */
  getAgentCapabilities: (agentId: string) => Promise<AgentCapabilitiesDisplay>;

  /**
   * Demonstrates a specific agent feature
   * Provides interactive preview of agent capabilities
   * @param params.agentId - Agent ID to demonstrate
   * @param params.feature - Feature name to demonstrate
   * @returns Promise<FeatureDemoDisplay> - Interactive feature demonstration
   */
  tryAgentFeature: (params: {
    agentId: string;
    feature: string;
  }) => Promise<FeatureDemoDisplay>;
}

// ============================================================================
// Display-Optimized Types
// ============================================================================

/**
 * Display-ready agent information
 */
export interface AgentDisplay {
  id: string;
  type: 'learning' | 'tutoring' | 'assessment' | 'practice';
  name: string;
  description: string;
  avatar: string;
  color: string;
  capabilities: string[];
  isAvailable: boolean;
  category: string;
  stats: {
    sessionsCount: number;
    avgRating: number;
  };
  specialties: string[];
  languages: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  interactive: boolean;
}

/**
 * Agent context for session association
 */
export interface AgentContext {
  sessionId: string;
  agentId: string;
  agentSettings: AgentSettings;
  sessionHistory: {
    previousSessions: number;
    avgRating: number;
    totalInteractionTime: string;
  };
  personalizedSettings: {
    preferredTopics: string[];
    avoidedTopics: string[];
    communicationStyle: string;
    pacePreference: 'slow' | 'medium' | 'fast';
  };
  initialContext: string[];
}

/**
 * Agent configuration settings
 */
export interface AgentSettings {
  agentId: string;
  personality: 'friendly encouraging' | 'formal professional' | 'casual friendly' | 'technical expert';
  responseStyle: {
    detailLevel: 'brief' | 'balanced' | 'comprehensive';
    includeExamples: boolean;
    useAnalogies: boolean;
    provideStepByStep: boolean;
    language: string;
    technicalDepth: 'beginner' | 'intermediate' | 'advanced';
  };
  interaction: {
    enableFollowUpQuestions: boolean;
    proactiveSuggestions: boolean;
    encouragementLevel: 'minimal' | 'moderate' | 'high';
    humorLevel: 'none' | 'light' | 'frequent';
  };
  preferences: {
    responseLength: 'short' | 'medium' | 'long';
    formalityLevel: 'casual' | 'semi-formal' | 'formal';
    useEmojis: boolean;
  };
}

/**
 * Response style configuration
 */
export interface ResponseStyleSettings {
  detailLevel: 'brief' | 'balanced' | 'comprehensive';
  includeExamples: boolean;
  useAnalogies: boolean;
  provideStepByStep: boolean;
  language: string;
  technicalDepth: 'beginner' | 'intermediate' | 'advanced';
  responseLength: 'short' | 'medium' | 'long';
  formalityLevel: 'casual' | 'semi-formal' | 'formal';
  useVisualAids: boolean;
  provideCodeExamples: boolean;
}

/**
 * Detailed agent capabilities for display
 */
export interface AgentCapabilitiesDisplay {
  agentId: string;
  capabilities: AgentCapability[];
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

/**
 * Individual agent capability
 */
export interface AgentCapability {
  name: string;
  description: string;
  features: string[];
  limitations: string[];
  bestFor: string[];
  confidence: number; // 0-1 confidence level
  examples: string[];
  complexity: 'basic' | 'intermediate' | 'advanced';
}

/**
 * Interactive feature demonstration
 */
export interface FeatureDemoDisplay {
  agentId: string;
  feature: string;
  demoType: 'interactive' | 'guided' | 'example' | 'simulation';
  description: string;
  samplePrompts: string[];
  demoInteraction: {
    type: 'guided_example' | 'interactive_tutorial' | 'live_demo' | 'simulation';
    steps: DemoStep[];
  };
  expectedOutcome: string;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Individual demo step
 */
export interface DemoStep {
  instruction: string;
  input: {
    type: 'text' | 'choice' | 'file' | 'interactive';
    options?: string[];
    placeholder?: string;
  };
  output: 'explanation_preview' | 'example_response' | 'interactive_result';
  tips?: string[];
  expectedTime?: string;
}

// ============================================================================
// Agent State and Performance Types
// ============================================================================

/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  agentId: string;
  timeRange: string;
  metrics: {
    totalSessions: number;
    averageSessionDuration: string;
    userSatisfaction: number;
    taskCompletionRate: number;
    responseQuality: number;
    engagementLevel: number;
  };
  strengths: string[];
  improvementAreas: string[];
  userFeedback: Array<{
    rating: number;
    comment: string;
    sessionType: string;
    timestamp: string;
  }>;
}

/**
 * Agent comparison data
 */
export interface AgentComparison {
  agents: AgentDisplay[];
  comparisonCriteria: string[];
  rankings: Array<{
    criterion: string;
    ranking: Array<{
      agentId: string;
      score: number;
      rank: number;
    }>;
  }>;
  recommendations: {
    bestOverall: string;
    bestForBeginners: string;
    bestForAdvanced: string;
    mostResponsive: string;
    mostComprehensive: string;
  };
}