/**
 * Settings & Configuration API
 *
 * Manages user preferences, AI provider configuration, and application settings.
 * Focuses on personalizing the learning experience and managing technical configurations.
 */

export interface SettingsAPI {
  /**
   * Gets comprehensive user preferences
   * Returns all user-configurable settings in display-ready format
   * @returns Promise<UserPreferencesDisplay> - Complete user preferences
   */
  getUserPreferences: () => Promise<UserPreferencesDisplay>;

  /**
   * Updates user preferences
   * Applies changes to user configuration settings
   * @param preferences - Partial preferences object to update
   * @returns Promise<{ success: boolean; updatedSettings: any; changes: string[] }>
   */
  updatePreferences: (preferences: Partial<UserPreferencesUpdate>) => Promise<{
    success: boolean;
    updatedSettings: any;
    changes: string[];
  }>;

  /**
   * Gets available AI providers and their status
   * Returns configured and available AI providers
   * @returns Promise<ProviderDisplay[]> - Array of AI providers
   */
  getAvailableProviders: () => Promise<ProviderDisplay[]>;

  /**
   * Configures an AI provider with authentication and settings
   * Sets up or updates provider configuration
   * @param params.provider - Provider ID to configure
   * @param params.config - Provider configuration object
   * @returns Promise<{ success: boolean; providerId: string; status: string }>
   */
  configureProvider: (params: {
    provider: string;
    config: ProviderConfig;
  }) => Promise<{ success: boolean; providerId: string; status: string }>;

  /**
   * Gets learning-specific settings
   * Returns settings related to learning preferences and goals
   * @returns Promise<LearningSettingsDisplay> - Learning configuration settings
   */
  getLearningSettings: () => Promise<LearningSettingsDisplay>;

  /**
   * Updates learning-specific settings
   * Modifies learning preferences, goals, and tracking settings
   * @param settings - Learning settings to update
   * @returns Promise<{ success: boolean; updatedSettings: any; impact: string[] }>
   */
  updateLearningSettings: (settings: Partial<LearningSettingsUpdate>) => Promise<{
    success: boolean;
    updatedSettings: any;
    impact: string[];
  }>;

  }

// ============================================================================
// Display-Optimized Types
// ============================================================================

/**
 * Complete user preferences for display
 */
export interface UserPreferencesDisplay {
  profile: UserProfile;
  learning: LearningPreferences;
  interface: InterfacePreferences;
  privacy: PrivacyPreferences;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
  advanced: AdvancedPreferences;
}

/**
 * User profile information
 */
export interface UserProfile {
  name: string;
  avatar?: string;
  timezone: string;
  language: string;
  email?: string;
  bio?: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  interests: string[];
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
}

/**
 * Learning preferences
 */
export interface LearningPreferences {
  preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  dailyGoalMinutes: number;
  weeklyGoalSessions: number;
  preferredSessionDuration: '15min' | '25min' | '45min' | '60min' | 'custom';
  enableReminders: boolean;
  reminderTime: string;
  preferredTopics: string[];
  avoidedTopics: string[];
  pace: 'relaxed' | 'balanced' | 'intensive';
  enableProgressTracking: boolean;
  shareProgressPublicly: boolean;
  defaultAgentType: 'learning' | 'tutoring' | 'assessment' | 'practice';
}

/**
 * Interface preferences
 */
export interface InterfacePreferences {
  theme: 'light' | 'dark' | 'auto' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  fontFamily: 'system' | 'serif' | 'mono' | 'custom';
  enableAnimations: boolean;
  compactMode: boolean;
  showProgressIndicators: boolean;
  showKeyboardShortcuts: boolean;
  sidebarCollapsed: boolean;
  layout: 'default' | 'focus' | 'presentation';
  colorScheme: string;
  customCSS?: string;
}

/**
 * Privacy preferences
 */
export interface PrivacyPreferences {
  shareAnalytics: boolean;
  saveConversationHistory: boolean;
  dataRetentionDays: number;
  enableCrashReports: boolean;
  shareProgressStats: boolean;
  publicProfile: boolean;
  allowDataCollection: boolean;
  anonymizeUsage: boolean;
  cookieConsent: boolean;
  locationTracking: boolean;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  enableDesktopNotifications: boolean;
  enableEmailNotifications: boolean;
  enableInAppNotifications: boolean;
  learningReminders: boolean;
  achievementAlerts: boolean;
  weeklyProgress: boolean;
  streakReminders: boolean;
  newFeatures: boolean;
  systemNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly';
}

/**
 * Accessibility preferences
 */
export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  largeText: boolean;
  colorBlindSupport: boolean;
  dyslexiaFont: boolean;
  voiceControl: boolean;
  subtitles: boolean;
  captionStyle: 'default' | 'high-contrast' | 'large' | 'custom';
}

/**
 * Advanced preferences
 */
export interface AdvancedPreferences {
  developerMode: boolean;
  betaFeatures: boolean;
  debugMode: boolean;
  apiAccess: boolean;
  customProviders: boolean;
  exportData: boolean;
  integrations: Record<string, boolean>;
  experimentalFeatures: string[];
  performanceMode: 'balanced' | 'speed' | 'quality';
  cacheSettings: {
    enableCache: boolean;
    cacheSize: string;
    clearOnExit: boolean;
  };
}

/**
 * User preferences update object
 */
export interface UserPreferencesUpdate {
  profile?: Partial<UserProfile>;
  learning?: Partial<LearningPreferences>;
  interface?: Partial<InterfacePreferences>;
  privacy?: Partial<PrivacyPreferences>;
  notifications?: Partial<NotificationPreferences>;
  accessibility?: Partial<AccessibilityPreferences>;
  advanced?: Partial<AdvancedPreferences>;
}

/**
 * AI provider display information
 */
export interface ProviderDisplay {
  id: string;
  name: string;
  displayName: string;
  description: string;
  models: ProviderModel[];
  status: 'configured' | 'not_configured' | 'error' | 'testing';
  isDefault: boolean;
  capabilities: ProviderCapability[];
  pricing: 'free' | 'pay-per-use' | 'subscription' | 'freemium';
  configuredAt?: string;
  lastTested?: string;
  icon?: string;
  website?: string;
  documentation?: string;
  features: string[];
  limitations: string[];
}

/**
 * Individual provider model
 */
export interface ProviderModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  contextWindow: number;
  maxTokens: number;
  pricing: {
    input: number; // per 1K tokens
    output: number; // per 1K tokens
    currency: string;
  };
  capabilities: string[];
  speed: 'fast' | 'medium' | 'slow';
  quality: 'basic' | 'standard' | 'premium';
  useCases: string[];
  status: 'available' | 'deprecated' | 'beta';
}

/**
 * Provider capability
 */
export type ProviderCapability = 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'function-calling' | 'streaming' | 'long-context';

/**
 * Provider configuration object
 */
export interface ProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  isDefault?: boolean;
  endpoint?: string;
  timeout?: number;
  retries?: number;
  customSettings?: Record<string, any>;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

/**
 * Learning settings display
 */
export interface LearningSettingsDisplay {
  goals: LearningGoals;
  preferences: LearningPreferencesExtended;
  notifications: LearningNotifications;
  tracking: LearningTracking;
  recommendations: RecommendationSettings;
  customization: LearningCustomization;
}

/**
 * Learning goals configuration
 */
export interface LearningGoals {
  dailyMinutes: number;
  weeklySessions: number;
  monthlyTopics: number;
  quarterlyMilestones: string[];
  yearlyObjectives: string[];
  skillTargets: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
  certificationGoals: string[];
}

/**
 * Extended learning preferences
 */
export interface LearningPreferencesExtended {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  pace: 'relaxed' | 'balanced' | 'intensive';
  sessionLength: '15min' | '25min' | '45min' | '60min' | 'custom';
  breakInterval: '5min' | '10min' | '15min' | 'none';
  preferredTimes: string[];
  focusAreas: string[];
  teachingMethod: 'direct' | 'socratic' | 'discovery' | 'collaborative';
  feedbackFrequency: 'immediate' | 'periodic' | 'on-demand';
}

/**
 * Learning notification settings
 */
export interface LearningNotifications {
  dailyReminders: boolean;
  reminderTime: string;
  achievementAlerts: boolean;
  weeklyProgress: boolean;
  streakReminders: boolean;
  goalProgress: boolean;
  recommendedContent: boolean;
  reviewReminders: boolean;
  celebrationMessages: boolean;
  nudges: boolean;
}

/**
 * Learning tracking settings
 */
export interface LearningTracking {
  enableAnalytics: boolean;
  shareProgress: boolean;
  detailedLogging: boolean;
  exportData: boolean;
  retentionPeriod: number;
  trackingLevel: 'basic' | 'detailed' | 'comprehensive';
  metrics: string[];
  reportFrequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * Recommendation settings
 */
export interface RecommendationSettings {
  enableRecommendations: boolean;
  recommendationSource: 'ai' | 'community' | 'curated' | 'mixed';
  difficultyAdaptation: boolean;
  interestBased: boolean;
  collaborativeFiltering: boolean;
  recommendationFrequency: 'real-time' | 'daily' | 'weekly';
  excludeTopics: string[];
  preferredFormats: string[];
}

/**
 * Learning customization settings
 */
export interface LearningCustomization {
  customLearningPaths: boolean;
  adaptiveDifficulty: boolean;
  personalizedContent: boolean;
  customGoals: boolean;
  customMetrics: string[];
  integrationSettings: Record<string, boolean>;
  exportFormats: string[];
  customPrompts: string[];
}

/**
 * Learning settings update object
 */
export interface LearningSettingsUpdate {
  goals?: Partial<LearningGoals>;
  preferences?: Partial<LearningPreferencesExtended>;
  notifications?: Partial<LearningNotifications>;
  tracking?: Partial<LearningTracking>;
  recommendations?: Partial<RecommendationSettings>;
  customization?: Partial<LearningCustomization>;
}