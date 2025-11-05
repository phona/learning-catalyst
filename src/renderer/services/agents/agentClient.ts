/**
 * Agent Client - Frontend API client for agent operations
 * Clean interface with proper error handling and status monitoring
 */

import type { AgentDisplay, AgentSettings } from '../../types';

interface AgentStatusCache {
  [agentId: string]: {
    status: { isOnline: boolean; isProcessing: boolean; currentTask?: string };
    lastUpdated: number;
    ttl: number;
  };
}

export class AgentClient {
  private statusCache: AgentStatusCache = {};

  /**
   * Get all available agents
   */
  async getAgents(): Promise<{ agents: AgentDisplay[]; error?: string }> {
    try {
      console.log('[AgentClient] Fetching available agents');

      const response = await window.electronAPI.agents.list();

      if (!response.success) {
        throw new Error(response.error || 'Failed to get agents');
      }

      console.log(`[AgentClient] Retrieved ${response.agents.length} agents`);

      return {
        agents: response.agents
      };
    } catch (error) {
      console.error('[AgentClient] getAgents error:', error);
      return {
        agents: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string): Promise<{ agent?: AgentDisplay; error?: string }> {
    try {
      console.log(`[AgentClient] Getting agent: ${agentId}`);

      const response = await window.electronAPI.agents.get(agentId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get agent');
      }

      return {
        agent: response.agent
      };
    } catch (error) {
      console.error('[AgentClient] getAgent error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Select an agent for a session
   */
  async selectAgent(sessionId: string, agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[AgentClient] Selecting agent ${agentId} for session ${sessionId}`);

      const response = await window.electronAPI.agents.select(sessionId, agentId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to select agent');
      }

      console.log(`[AgentClient] Agent ${agentId} selected successfully for session ${sessionId}`);

      return { success: true };
    } catch (error) {
      console.error('[AgentClient] selectAgent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get agent status (with caching)
   */
  async getAgentStatus(agentId: string, useCache = true): Promise<{
    isOnline: boolean;
    isProcessing: boolean;
    currentTask?: string;
    error?: string
  }> {
    try {
      // Check cache first
      if (useCache && this.isStatusCacheValid(agentId)) {
        console.log(`[AgentClient] Using cached status for agent ${agentId}`);
        return this.statusCache[agentId].status;
      }

      console.log(`[AgentClient] Getting status for agent ${agentId}`);

      const response = await window.electronAPI.agents.getStatus(agentId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get agent status');
      }

      const status = {
        isOnline: response.isOnline,
        isProcessing: response.isProcessing,
        currentTask: response.currentTask
      };

      // Update cache
      this.updateStatusCache(agentId, status);

      return status;
    } catch (error) {
      console.error('[AgentClient] getAgentStatus error:', error);
      return {
        isOnline: false,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get agents by category
   */
  async getAgentsByCategory(category: 'learning' | 'creative' | 'analysis'): Promise<{ agents: AgentDisplay[]; error?: string }> {
    try {
      const result = await this.getAgents();

      if (result.error) {
        throw new Error(result.error);
      }

      const filteredAgents = result.agents.filter(agent => agent.category === category);

      return {
        agents: filteredAgents
      };
    } catch (error) {
      console.error('[AgentClient] getAgentsByCategory error:', error);
      return {
        agents: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available agents only
   */
  async getAvailableAgents(): Promise<{ agents: AgentDisplay[]; error?: string }> {
    try {
      const result = await this.getAgents();

      if (result.error) {
        throw new Error(result.error);
      }

      const availableAgents = result.agents.filter(agent => agent.isAvailable);

      return {
        agents: availableAgents
      };
    } catch (error) {
      console.error('[AgentClient] getAvailableAgents error:', error);
      return {
        agents: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Monitor agent status changes
   */
  startStatusMonitoring(agentIds: string[], interval = 5000): () => void {
    console.log(`[AgentClient] Starting status monitoring for ${agentIds.length} agents`);

    const intervalId = setInterval(async () => {
      for (const agentId of agentIds) {
        try {
          await this.getAgentStatus(agentId, false); // Don't use cache for monitoring
        } catch (error) {
          console.error(`[AgentClient] Error monitoring status for agent ${agentId}:`, error);
        }
      }
    }, interval);

    // Return function to stop monitoring
    return () => {
      console.log(`[AgentClient] Stopping status monitoring for ${agentIds.length} agents`);
      clearInterval(intervalId);
    };
  }

  /**
   * Get recommended agent for a task
   */
  async getRecommendedAgent(task: string, preferences?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    responseStyle?: 'concise' | 'detailed' | 'conversational';
  }): Promise<{ agent?: AgentDisplay; confidence: number; reasoning: string; error?: string }> {
    try {
      console.log(`[AgentClient] Getting recommendation for task: "${task}"`);

      const result = await this.getAvailableAgents();

      if (result.error) {
        throw new Error(result.error);
      }

      // Simple recommendation logic (could be enhanced with AI)
      let bestAgent: AgentDisplay | undefined;
      let bestScore = 0;
      let reasoning = '';

      const taskLower = task.toLowerCase();

      for (const agent of result.agents) {
        let score = 0;
        let agentReasoning = '';

        // Score based on task content
        if (taskLower.includes('learn') || taskLower.includes('explain') || taskLower.includes('teach')) {
          if (agent.type === 'learning' || agent.type === 'tutoring') {
            score += 3;
            agentReasoning = 'Learning-focused agent for educational tasks';
          }
        }

        if (taskLower.includes('practice') || taskLower.includes('exercise') || taskLower.includes('train')) {
          if (agent.type === 'practice') {
            score += 3;
            agentReasoning = 'Practice agent for skill-building';
          }
        }

        if (taskLower.includes('test') || taskLower.includes('quiz') || taskLower.includes('assess')) {
          if (agent.type === 'assessment') {
            score += 3;
            agentReasoning = 'Assessment agent for evaluation';
          }
        }

        if (taskLower.includes('research') || taskLower.includes('analyze') || taskLower.includes('investigate')) {
          if (agent.type === 'research') {
            score += 3;
            agentReasoning = 'Research agent for analysis and investigation';
          }
        }

        // Score based on agent stats
        if (agent.stats) {
          score += agent.stats.avgRating / 5; // 0-1 points for rating
          score += Math.min(agent.stats.sessionsCount / 100, 1); // 0-1 points for experience
        }

        // Apply user preferences
        if (preferences?.difficulty) {
          // Could match agent capabilities with requested difficulty
          score += 0.5;
        }

        if (score > bestScore) {
          bestScore = score;
          bestAgent = agent;
          reasoning = agentReasoning || 'Best match based on capabilities and performance';
        }
      }

      if (!bestAgent) {
        // Fallback to first available agent
        bestAgent = result.agents[0];
        reasoning = 'Default selection - no specific match found';
      }

      const confidence = Math.min(bestScore / 5, 1); // Normalize to 0-1

      console.log(`[AgentClient] Recommended agent: ${bestAgent.name} (confidence: ${confidence.toFixed(2)})`);

      return {
        agent: bestAgent,
        confidence,
        reasoning
      };
    } catch (error) {
      console.error('[AgentClient] getRecommendedAgent error:', error);
      return {
        confidence: 0,
        reasoning: 'Failed to get recommendation',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate agent selection
   */
  validateAgentSelection(agentId: string, sessionId: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!agentId || typeof agentId !== 'string') {
      errors.push('Agent ID is required');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      errors.push('Session ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format agent capabilities for display
   */
  formatAgentCapabilities(capabilities: string[]): { formatted: string[]; categories: string[] } {
    const formatted = capabilities.map(cap => cap.replace(/([A-Z])/g, ' $1').trim());
    const categories = [...new Set(formatted.map(cap => cap.split(' ')[0]))];

    return {
      formatted,
      categories
    };
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentId: string): Promise<{
    metrics?: {
      avgResponseTime: number;
      successRate: number;
      userSatisfaction: number;
      totalSessions: number;
      averageSessionDuration: number;
    };
    error?: string
  }> {
    try {
      const agentResult = await this.getAgent(agentId);

      if (agentResult.error || !agentResult.agent) {
        throw new Error(agentResult.error || 'Agent not found');
      }

      // Extract metrics from agent stats (in real app, this would come from a dedicated metrics API)
      const stats = agentResult.agent.stats;

      if (stats) {
        const metrics = {
          avgResponseTime: 2000, // Placeholder - would come from actual metrics
          successRate: stats.successRate || 0.9,
          userSatisfaction: stats.avgRating / 5,
          totalSessions: stats.sessionsCount,
          averageSessionDuration: 1800000 // 30 minutes placeholder
        };

        return { metrics };
      }

      // Return default metrics if no stats available
      return {
        metrics: {
          avgResponseTime: 2000,
          successRate: 0.9,
          userSatisfaction: 0.8,
          totalSessions: 0,
          averageSessionDuration: 1800000
        }
      };
    } catch (error) {
      console.error('[AgentClient] getAgentMetrics error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Private cache methods
  private isStatusCacheValid(agentId: string): boolean {
    const cached = this.statusCache[agentId];
    if (!cached) return false;

    return Date.now() - cached.lastUpdated < cached.ttl;
  }

  private updateStatusCache(agentId: string, status: { isOnline: boolean; isProcessing: boolean; currentTask?: string }): void {
    this.statusCache[agentId] = {
      status,
      lastUpdated: Date.now(),
      ttl: 10000 // 10 seconds
    };
  }
}

// Export singleton instance
export const agentClient = new AgentClient();