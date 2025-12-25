/**
 * Sessions IPC request DTOs ("wire" types)
 *
 * These types are used as payloads for Electron IPC calls and must be safe to
 * import from both main and renderer.
 */

export interface SessionCreateRequest {
  title?: string;
  threadId?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'beginner' | 'intermediate' | 'advanced';
  agentType?: string;
  description?: string;
}

export interface SessionUpdateRequest {
  title?: string;
  description?: string;
  tags?: string[];
  isBookmarked?: boolean;
  isArchived?: boolean;
  status?: 'active' | 'paused' | 'completed';
}

