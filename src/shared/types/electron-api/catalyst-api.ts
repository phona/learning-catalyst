/**
 * Catalyst API Interface
 *
 * High-level API for agent execution and management operations.
 * Provides simplified interface to the complex multi-agent architecture
 * running in the main process.
 */

export interface CatalystAPI {
  /**
   * Execute an agent and get response
   */
  catalyst: {
    /**
     * Execute an agent with the provided request
     */
    executeAgent: (request: any) => Promise<any>;

    /**
     * Execute an agent with streaming response
     */
    executeAgentStream: (request: any) => Promise<any>;

    /**
     * Cancel an active agent execution
     */
    cancelAgent: (executionId: string) => Promise<{ success: boolean }>;

    /**
     * Get the status of an agent execution
     */
    getAgentStatus: (executionId: string) => Promise<any>;

    /**
     * List all registered agents
     */
    listAgents: () => Promise<any[]>;

    /**
     * Register a new agent
     */
    registerAgent: (agentConfig: any) => Promise<{ success: boolean }>;

    /**
     * Unregister an agent
     */
    unregisterAgent: (agentId: string) => Promise<{ success: boolean }>;

    /**
     * Get all active agent executions
     */
    getActiveExecutions: () => Promise<any[]>;
  };
}