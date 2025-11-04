/**
 * Qdrant Vector Database Operations API
 *
 * Provides Qdrant vector database operations through Electron IPC
 */

export interface QdrantAPI {
  /**
   * Start Qdrant service
   * @returns Operation result
   */
  qdrantStart: () => Promise<{ success: boolean; error?: string }>;

  /**
   * Stop Qdrant service
   * @returns Operation result
   */
  qdrantStop: () => Promise<{ success: boolean; error?: string }>;

  /**
   * Get Qdrant service status
   * @returns Service status information
   */
  qdrantStatus: () => Promise<{ success: boolean; status?: any; error?: string }>;

  /**
   * List all Qdrant collections
   * @returns List of collections
   */
  qdrantCollections: () => Promise<{ success: boolean; collections?: any[]; error?: string }>;

  /**
   * Create a new Qdrant collection
   * @param name - Collection name
   * @param vectorSize - Vector dimension size
   * @param distance - Distance metric type
   * @returns Operation result
   */
  qdrantCreateCollection: (name: string, vectorSize: number, distance?: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * Delete a Qdrant collection
   * @param name - Collection name
   * @returns Operation result
   */
  qdrantDeleteCollection: (name: string) => Promise<{ success: boolean; error?: string }>;
}