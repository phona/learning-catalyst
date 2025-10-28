/**
 * Vector Database Module (Renderer-Safe Version)
 *
 * Provides vector storage and semantic search capabilities using IPC to communicate
 * with the main process where the actual Qdrant operations are performed.
 *
 * This renderer-safe version delegates all operations to the main process through IPC.
 */

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
  metadata: Record<string, any>;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export class VectorDatabaseModule {
  private _isInitialized = false;
  public databaseModule: any = null; // Optional database dependency

  constructor() {
    console.log('Vector database module created (renderer mode)');
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing vector database (renderer mode)...');

      // Check if we're in an Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Initialize through IPC
        const result = await window.electronAPI.vectorInitialize();
        if (result.success) {
          this._isInitialized = true;
          console.log('Vector database initialized successfully (renderer mode)');
        } else {
          console.error('Vector database initialization failed:', result.error);
          this._isInitialized = false;
        }
      } else {
        // Fallback to mock mode for web development
        console.log('Electron API not available, using mock mode');
        this._isInitialized = true;
      }
    } catch (error) {
      console.error('Vector database initialization failed:', error);
      this._isInitialized = false;
    }
  }

  async start(): Promise<void> {
    try {
      if (this._isInitialized) {
        console.log('Vector database already initialized');
        return;
      }

      await this.initialize();
      console.log('Vector database started successfully');
    } catch (error) {
      console.error('Vector database start failed:', error);
    }
  }

  async stop(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.vectorStop();
    }
    console.log('Vector database stopped');
  }

  async cleanup(): Promise<void> {
    this._isInitialized = false;
    console.log('Vector database cleaned up');
  }

  /**
   * Add or update a document in the vector database
   */
  async addDocument(document: Omit<VectorDocument, 'embedding' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Vector database not initialized - skipping document addition');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.vectorAddDocument(document);
        if (!result.success) {
          throw new Error(result.error || 'Failed to add document');
        }
      } else {
        // Mock mode for web development
        console.log('Mock: Document added', document.id);
      }

      console.log(`Document ${document.id} added to vector database`);
    } catch (error) {
      console.error('Error adding document to vector database:', error);
    }
  }

  /**
   * Search for similar documents
   */
  async search(query: string, options: VectorSearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      console.warn('Vector database not initialized - returning empty results');
      return [];
    }

    try {
      const { limit = 10, threshold = 0.7, filter } = options;

      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.vectorSearch(query, {
          limit,
          threshold,
          filter
        });

        if (result.success && result.results) {
          // Convert string dates back to Date objects
          return result.results.map((item: any) => ({
            ...item,
            document: {
              ...item.document,
              createdAt: new Date(item.document.createdAt),
              updatedAt: new Date(item.document.updatedAt)
            }
          }));
        } else {
          throw new Error(result.error || 'Search failed');
        }
      } else {
        // Mock mode for web development
        console.log(`Mock search for: "${query}"`);
        return [];
      }
    } catch (error) {
      console.error('Error searching vector database:', error);
      return [];
    }
  }

  /**
   * Delete a document from the vector database
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Vector database not initialized - skipping document deletion');
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.vectorDeleteDocument(documentId);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete document');
        }
      } else {
        // Mock mode for web development
        console.log('Mock: Document deleted', documentId);
      }

      console.log(`Document ${documentId} deleted from vector database`);
    } catch (error) {
      console.error('Error deleting document from vector database:', error);
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ totalDocuments: number; collectionExists: boolean }> {
    if (!this.isInitialized) {
      return {
        totalDocuments: 0,
        collectionExists: false
      };
    }

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.vectorGetStats();
        if (result.success) {
          return result.stats;
        } else {
          throw new Error(result.error || 'Failed to get stats');
        }
      } else {
        // Mock mode for web development
        return {
          totalDocuments: 0,
          collectionExists: false
        };
      }
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        totalDocuments: 0,
        collectionExists: false
      };
    }
  }
}

// Export singleton instance
export const vectorDatabase = new VectorDatabaseModule();