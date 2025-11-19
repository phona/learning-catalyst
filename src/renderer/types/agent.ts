
/**
 * Agent representation optimized for UI display
 * Transforms complex agent data into frontend-friendly format
 */

export interface AgentDisplay {
  id: string;
  type: 'learning' | 'tutoring' | 'assessment' | 'practice' | 'research';
  name: string;              // "Learning Assistant"
  description: string;       // One-line description
  avatar: string;            // Emoji or icon path
  color: string;             // Primary color for UI theming
  capabilities: string[];    // Short capability list for display
  isAvailable: boolean;
  isPremium?: boolean;       // For future monetization
  category: 'learning' | 'creative' | 'analysis';
  stats?: {
    sessionsCount: number;
    avgRating: number;
    totalInteractions: number;
    successRate: number;
  };
  settings?: AgentSettings;
}

export interface AgentSettings {
  responseStyle: 'concise' | 'detailed' | 'conversational';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  enableFollowUpQuestions: boolean;
  enableExamples: boolean;
  enableAnalogies: boolean;
  customInstructions?: string;
}

export interface AgentListDisplay {
  agents: AgentDisplay[];
  categories: AgentCategory[];
  selectedCategory?: string;
  searchQuery?: string;
}

export interface AgentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  agentTypes: string[];
}

export interface AgentSelectRequest {
  sessionId: string;
  agentId: string;
  settings?: Partial<AgentSettings>;
}

export interface AgentStatusDisplay {
  agentId: string;
  isOnline: boolean;
  isProcessing: boolean;
  currentTask?: string;
  processingTime?: number;
  queuePosition?: number;
}

export interface AgentPerformanceMetrics {
  avgResponseTime: number;
  successRate: number;
  userSatisfaction: number;
  totalSessions: number;
  averageSessionDuration: number;
}

export const DEFAULT_AGENT_CATEGORIES: AgentCategory[] = [
  {
    id: 'learning',
    name: 'Learning',
    description: 'Agents focused on teaching and knowledge acquisition',
    icon: '📚',
    color: '#3B82F6',
    agentTypes: ['learning', 'tutoring']
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Agents for creative problem-solving and brainstorming',
    icon: '🎨',
    color: '#8B5CF6',
    agentTypes: ['practice']
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Agents for research, analysis, and assessment',
    icon: '🔍',
    color: '#F59E0B',
    agentTypes: ['assessment', 'research']
  }
];

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  responseStyle: 'conversational',
  difficultyLevel: 'intermediate',
  language: 'en',
  enableFollowUpQuestions: true,
  enableExamples: true,
  enableAnalogies: true
};