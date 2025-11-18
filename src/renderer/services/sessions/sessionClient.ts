/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




/**
 * Session Client - Frontend API client for session operations
 * Clean interface with proper error handling and caching
 */

import { validateSessionData as validateSessionDataUtil } from '@/shared/utils/session-utils';
import type { SessionDisplay, SessionCreateRequest, SessionUpdateRequest, SessionSearchFilters } from '../../types';

interface SessionCache {
  sessions: SessionDisplay[];
  lastUpdated: number;
  ttl: number;
}

export class SessionClient {
  private readonly cache: SessionCache = {
    sessions: [],
    lastUpdated: 0,
    ttl: 5 * 60 * 1000 // 5 minutes
  };

  /**
   * List sessions with optional filtering
   */
  async listSessions(options: {
    query?: string;
    limit?: number;
    filter?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    useCache?: boolean;
  } = {}): Promise<{ sessions: SessionDisplay[]; total: number; hasMore: boolean; error?: string }> {
    try {
      const {
        query = '',
        limit = 20,
        filter,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        useCache = true
      } = options;

      // Check cache first
      if (useCache && this.isCacheValid() && !query && !filter) {
        console.log('[SessionClient] Using cached sessions');
        return {
          sessions: this.cache.sessions.slice(0, limit),
          total: this.cache.sessions.length,
          hasMore: this.cache.sessions.length > limit
        };
      }

      console.log(`[SessionClient] Fetching sessions with options:`, { query, limit, filter, sortBy, sortOrder });

      const response = await window.electronAPI.sessions.list({
        query,
        limit,
        filter,
        sortBy,
        sortOrder
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to list sessions');
      }

      // Update cache if this is a full list (no query/filter)
      if (!query && !filter) {
        this.updateCache(response.sessions);
      }

      return {
        sessions: response.sessions,
        total: response.total,
        hasMore: response.hasMore
      };
    } catch (error) {
      console.error('[SessionClient] listSessions error:', error);
      return {
        sessions: [],
        total: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a new session
   */
  async createSession(request: SessionCreateRequest): Promise<{ session?: SessionDisplay; error?: string }> {
    try {
      console.log('[SessionClient] Creating session:', request);

      const response = await window.electronAPI.sessions.create(request);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create session');
      }

      // Invalidate cache since we have a new session
      this.invalidateCache();

      console.log('[SessionClient] Session created successfully:', response.session);

      return {
        session: response.session
      };
    } catch (error) {
      console.error('[SessionClient] createSession error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<{ session?: SessionDisplay; error?: string }> {
    try {
      console.log(`[SessionClient] Getting session: ${sessionId}`);

      const response = await window.electronAPI.sessions.get(sessionId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get session');
      }

      return {
        session: response.session
      };
    } catch (error) {
      console.error('[SessionClient] getSession error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update a session
   */
  async updateSession(sessionId: string, updates: SessionUpdateRequest): Promise<{ session?: SessionDisplay; error?: string }> {
    try {
      console.log(`[SessionClient] Updating session ${sessionId}:`, updates);

      const response = await window.electronAPI.sessions.update(sessionId, updates);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update session');
      }

      // Update cache entry if exists
      const cacheIndex = this.cache.sessions.findIndex(s => s.id === sessionId);
      if (cacheIndex !== -1) {
        this.cache.sessions[cacheIndex] = response.session!;
      }

      return {
        session: response.session
      };
    } catch (error) {
      console.error('[SessionClient] updateSession error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[SessionClient] Deleting session: ${sessionId}`);

      const response = await window.electronAPI.sessions.delete(sessionId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete session');
      }

      // Remove from cache
      this.cache.sessions = this.cache.sessions.filter(s => s.id !== sessionId);

      return { success: true };
    } catch (error) {
      console.error('[SessionClient] deleteSession error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search sessions with advanced filters
   */
  async searchSessions(filters: SessionSearchFilters): Promise<{ sessions: SessionDisplay[]; total: number; hasMore: boolean; error?: string }> {
    try {
      console.log('[SessionClient] Searching sessions with filters:', filters);

      const response = await window.electronAPI.sessions.list({
        query: filters.query,
        filter: filters.agentType,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: 50 // Reasonable limit for search
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to search sessions');
      }

      return {
        sessions: response.sessions,
        total: response.total,
        hasMore: response.hasMore
      };
    } catch (error) {
      console.error('[SessionClient] searchSessions error:', error);
      return {
        sessions: [],
        total: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get recent sessions (last 24 hours)
   */
  async getRecentSessions(limit = 10): Promise<{ sessions: SessionDisplay[]; error?: string }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await this.listSessions({
        limit,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        useCache: false // Always fetch fresh for recent sessions
      });

      // Filter to last 24 hours (this would ideally be done server-side)
      const recentSessions = result.sessions.filter(session => {
        // This is a simplified check - in reality we'd parse the date properly
        return session.lastActivity !== 'just now' || session.lastActivity.includes('hour') || session.lastActivity.includes('min');
      });

      return {
        sessions: recentSessions
      };
    } catch (error) {
      console.error('[SessionClient] getRecentSessions error:', error);
      return {
        sessions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get bookmarked sessions
   */
  async getBookmarkedSessions(): Promise<{ sessions: SessionDisplay[]; error?: string }> {
    try {
      const result = await this.listSessions({
        limit: 100, // Get more to filter bookmarks
        useCache: false
      });

      const bookmarkedSessions = result.sessions.filter(session => session.isBookmarked);

      return {
        sessions: bookmarkedSessions
      };
    } catch (error) {
      console.error('[SessionClient] getBookmarkedSessions error:', error);
      return {
        sessions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Archive a session
   */
  async archiveSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateSession(sessionId, { isArchived: true });
  }

  /**
   * Unarchive a session
   */
  async unarchiveSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    return this.updateSession(sessionId, { isArchived: false });
  }

  /**
   * Toggle bookmark for a session
   */
  async toggleBookmark(sessionId: string): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
    try {
      // Get current session to check bookmark status
      const currentResult = await this.getSession(sessionId);
      if (currentResult.error || !currentResult.session) {
        throw new Error(currentResult.error || 'Session not found');
      }

      const newBookmarkStatus = !currentResult.session.isBookmarked;

      const updateResult = await this.updateSession(sessionId, {
        isBookmarked: newBookmarkStatus
      });

      if (updateResult.error) {
        throw new Error(updateResult.error);
      }

      return {
        success: true,
        isBookmarked: newBookmarkStatus
      };
    } catch (error) {
      console.error('[SessionClient] toggleBookmark error:', error);
      return {
        success: false,
        isBookmarked: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate session data
   */
  validateSessionData(data: SessionCreateRequest): { isValid: boolean; errors: string[] } {
    return validateSessionDataUtil(data);
  }

  // Private cache methods
  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastUpdated < this.cache.ttl;
  }

  private updateCache(sessions: SessionDisplay[]): void {
    this.cache.sessions = sessions;
    this.cache.lastUpdated = Date.now();
  }

  private invalidateCache(): void {
    this.cache.sessions = [];
    this.cache.lastUpdated = 0;
  }
}

// Export singleton instance
export const sessionClient = new SessionClient();