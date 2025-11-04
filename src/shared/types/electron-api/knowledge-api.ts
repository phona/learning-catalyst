/**
 * Knowledge Graph Operations API
 *
 * Provides knowledge graph operations through Electron IPC
 */

export interface KnowledgeAPI {
  /**
   * Add item to knowledge graph
   * @param item - Item to add
   * @param embedding - Optional embedding vector
   * @param provider - Provider information
   * @returns Operation result
   */
  knowledgeAdd: (item: any, embedding?: number[], provider?: any) => Promise<{ success: boolean; error?: string }>;

  /**
   * Search knowledge graph
   * @param query - Search query
   * @param provider - Provider information
   * @param limit - Maximum number of results
   * @param filters - Search filters
   * @returns Search results
   */
  knowledgeSearch: (query: string, provider: any, limit?: number, filters?: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;

  /**
   * Get specific knowledge item
   * @param id - Item ID
   * @returns Knowledge item
   */
  knowledgeGet: (id: string) => Promise<{ success: boolean; item?: any; error?: string }>;

  /**
   * Update knowledge item
   * @param id - Item ID
   * @param updates - Update data
   * @param provider - Provider information
   * @returns Operation result
   */
  knowledgeUpdate: (id: string, updates: any, provider: any) => Promise<{ success: boolean; error?: string }>;

  /**
   * Delete knowledge item
   * @param id - Item ID
   * @returns Operation result
   */
  knowledgeDelete: (id: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * Store session context
   * @param sessionId - Session ID
   * @param messages - Session messages
   * @param provider - Provider information
   * @returns Operation result
   */
  knowledgeStoreContext: (sessionId: string, messages: any[], provider: any) => Promise<{ success: boolean; error?: string }>;

  /**
   * Get session context
   * @param sessionId - Session ID
   * @param query - Search query
   * @param provider - Provider information
   * @param limit - Maximum number of results
   * @returns Context information
   */
  knowledgeGetContext: (sessionId: string, query: string, provider: any, limit?: number) => Promise<{ success: boolean; context?: string[]; error?: string }>;

  /**
   * Get knowledge statistics
   * @returns Statistics information
   */
  knowledgeStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;

  /**
   * Clear all knowledge data
   * @returns Operation result
   */
  knowledgeClear: () => Promise<{ success: boolean; error?: string }>;
}