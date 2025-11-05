/**
 * Session representation optimized for UI display
 * Transforms complex session data into frontend-friendly format
 */

export interface SessionDisplay {
  id: string;
  title: string;
  preview: string;           // First 100 characters for card display
  messageCount: number;
  lastActivity: string;       // "2 min ago", "1 hour ago"
  duration: string;          // "15 min", "2 hours"
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  isActive: boolean;
  hasUnreadMessages: boolean;
  agentType?: string;
  color?: string;            // For UI theming
  learningProgress?: number; // 0-100 for progress indication
  masteryLevel?: number;     // 0-5 for skill level
  isBookmarked?: boolean;
  isArchived?: boolean;
}

export interface SessionListDisplay {
  sessions: SessionDisplay[];
  total: number;
  hasMore: boolean;
  loading?: boolean;
  filters?: {
    agentType?: string;
    difficulty?: string;
    tags?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

export interface SessionSearchFilters {
  query?: string;
  agentType?: string;
  difficulty?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'lastActivity' | 'created' | 'duration' | 'progress';
  sortOrder?: 'asc' | 'desc';
}

export interface SessionCreateRequest {
  title?: string;
  description?: string;
  agentType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  learningObjectives?: string[];
}

export interface SessionUpdateRequest {
  title?: string;
  description?: string;
  tags?: string[];
  isBookmarked?: boolean;
  isArchived?: boolean;
}