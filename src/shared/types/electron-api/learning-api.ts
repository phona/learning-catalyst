/**
 * Learning & Sessions API
 *
 * Manages structured learning sessions with progress tracking.
 * Focuses on educational outcomes and learning analytics.
 */

export interface LearningAPI {
  /**
   * Starts a new structured learning session
   * Creates a session with specific learning goals and tracks progress
   * @param params.topic - Main topic for the learning session
   * @param params.goals - Array of specific learning objectives
   * @param params.difficulty - 'beginner' | 'intermediate' | 'advanced'
   * @param params.agentType - Type of AI agent to guide the session
   * @param params.learningStyle - 'visual' | 'auditory' | 'kinesthetic' | 'reading'
   * @returns Promise<LearningSessionDisplay> - Session object with progress tracking
   */
  startLearningSession: (params: {
    topic: string;
    goals: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    agentType: string;
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  }) => Promise<LearningSessionDisplay>;

  /**
   * Gets detailed progress for a learning session
   * Returns comprehensive progress data for UI display
   * @param sessionId - Learning session ID
   * @returns Promise<LearningProgressDisplay> - Detailed progress information
   */
  getSessionProgress: (sessionId: string) => Promise<LearningProgressDisplay>;

  /**
   * Gets the structured learning path for a session
   * Returns the planned sequence of topics and activities
   * @param sessionId - Learning session ID
   * @returns Promise<LearningPathDisplay> - Structured learning path
   */
  getLearningPath: (sessionId: string) => Promise<LearningPathDisplay>;

  /**
   * Pauses an active learning session
   * Saves current state and stops progress tracking
   * @param sessionId - Active learning session ID
   * @returns Promise<{ success: boolean; resumeData: any }>
   */
  pauseSession: (sessionId: string) => Promise<{ success: boolean; resumeData: any }>;

  /**
   * Resumes a paused learning session
   * Restores session state and continues progress tracking
   * @param sessionId - Paused learning session ID
   * @returns Promise<{ success: boolean; context: LearningContext }>
   */
  resumeSession: (sessionId: string) => Promise<{ success: boolean; context: LearningContext }>;

  /**
   * Completes a learning session and generates summary
   * Calculates achievements and provides recommendations
   * @param sessionId - Learning session to complete
   * @returns Promise<SessionCompletionDisplay> - Completion summary and recommendations
   */
  completeSession: (sessionId: string) => Promise<SessionCompletionDisplay>;

  /**
   * Gets recent learning sessions for quick access
   * Returns sessions ordered by last activity
   * @param options.limit - Maximum number of sessions to return (default: 10)
   * @param options.agentType - Filter by agent type
   * @param options.status - Filter by session status
   * @returns Promise<SessionDisplay[]> - Array of recent sessions
   */
  getRecentSessions: (options?: {
    limit?: number;
    agentType?: string;
    status?: string;
  }) => Promise<SessionDisplay[]>;

  /**
   * Searches learning sessions with advanced filters
   * Supports text search and multiple filter criteria
   * @param query - Search query string
   * @param filters - Filter options (difficulty, agentType, dateRange, tags)
   * @returns Promise<SessionSearchResultDisplay> - Search results with pagination
   */
  searchSessions: (query: string, filters?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    agentType?: string;
    dateRange?: { start: Date; end: Date };
    tags?: string[];
  }) => Promise<SessionSearchResultDisplay>;
}

// ============================================================================
// Display-Optimized Types
// ============================================================================

/**
 * Display-ready learning session object
 */
export interface LearningSessionDisplay {
  id: string;
  topic: string;
  goals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'active' | 'paused' | 'completed' | 'error';
  progress: {
    percentage: number;
    completedGoals: string[];
    currentGoal: string | null;
    timeSpent: string;
  };
  estimatedDuration: string;
  agent: {
    type: string;
    name: string;
  };
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  createdAt: string;
  updatedAt: string;
}

/**
 * Display-ready learning progress information
 */
export interface LearningProgressDisplay {
  sessionId: string;
  percentage: number;
  completedGoals: string[];
  currentGoal: string;
  remainingGoals: string[];
  timeSpent: string;
  conceptsMastered: string[];
  strugglingConcepts: string[];
  achievements: AchievementDisplay[];
  progressByGoal: Array<{
    goal: string;
    progress: number;
    status: 'not_started' | 'in_progress' | 'completed';
  }>;
}

/**
 * Display-ready learning path
 */
export interface LearningPathDisplay {
  sessionId: string;
  path: LearningPathItem[];
  currentPosition: number;
  estimatedCompletion: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

/**
 * Individual learning path item
 */
export interface LearningPathItem {
  id: number;
  title: string;
  type: 'concept' | 'practice' | 'assessment' | 'break';
  completed: boolean;
  duration?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  description?: string;
}

/**
 * Learning context for session resumption
 */
export interface LearningContext {
  sessionId: string;
  lastActivity: string;
  currentProgress: LearningProgressDisplay;
  nextSteps: string[];
  contextSummary: string;
  agentMemory: {
    keyPoints: string[];
    userStruggles: string[];
    userStrengths: string[];
  };
}

/**
 * Session completion summary
 */
export interface SessionCompletionDisplay {
  sessionId: string;
  summary: {
    timeSpent: string;
    conceptsLearned: number;
    goalsCompleted: number;
    achievementsUnlocked: string[];
  };
  performance: {
    finalScore?: number;
    strengthAreas: string[];
    improvementAreas: string[];
  };
  recommendations: {
    nextTopics: string[];
    reviewTopics: string[];
    practiceExercises: string[];
  };
  insights: string[];
}

/**
 * Display-ready session for lists
 */
export interface SessionDisplay {
  id: string;
  title: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'active' | 'paused' | 'completed';
  progress: number;
  agent: {
    type: string;
    name: string;
  };
  lastActivity: string;
  duration: string;
  thumbnail?: string;
}

/**
 * Session search results
 */
export interface SessionSearchResultDisplay {
  query: string;
  totalResults: number;
  sessions: SessionDisplay[];
  filters: {
    appliedFilters: Record<string, any>;
    availableFilters: Record<string, string[]>;
  };
  suggestions: string[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * Display-ready achievement
 */
export interface AchievementDisplay {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'skill' | 'time' | 'streak';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
}