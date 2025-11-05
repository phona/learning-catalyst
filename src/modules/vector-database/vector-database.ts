/**
 * Mock Vector Database Module
 *
 * A mock implementation of the VectorDatabaseModule for integration testing.
 * This simulates vector database operations with fallback to mock mode
 * when the real vector database is unavailable.
 */

import { vi } from 'vitest';

export class VectorDatabaseModule {
  public isInitialized = false;
  public isMockMode = false;
  private collections = new Map<string, any[]>();

  constructor() {
    this.isInitialized = false;
    this.isMockMode = false;
  }

  async initialize(): Promise<void> {
    // Simulate vector database initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check if real vector database is available
    if (window.electronAPI?.invoke) {
      const result = await window.electronAPI.invoke('getVectorDbStatus');

      if (!result.success) {
        // Fall back to mock mode
        this.isMockMode = true;
        console.warn('Vector database unavailable, using mock mode');
      }
    } else {
      // No electronAPI available, use mock mode
      this.isMockMode = true;
    }

    this.isInitialized = true;
  }

  async addDocument(collection: string, document: any): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    if (this.isMockMode) {
      // Mock implementation - store in memory
      if (!this.collections.has(collection)) {
        this.collections.set(collection, []);
      }

      const docs = this.collections.get(collection)!;
      docs.push({
        ...document,
        id: document.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      });

      return true;
    }

    // Real vector database implementation
    if (window.electronAPI?.vectorAddDocument) {
      const result = await window.electronAPI.vectorAddDocument(collection, document);
      return result.success;
    }

    return false;
  }

  async search(collection: string, query: string, limit: number = 10): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    if (this.isMockMode) {
      // Mock implementation - simple text matching
      const docs = this.collections.get(collection) || [];
      const results = docs
        .filter(doc =>
          doc.content?.toLowerCase().includes(query.toLowerCase()) ||
          doc.metadata?.text?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)
        .map(doc => ({
          id: doc.id,
          score: 0.8 + Math.random() * 0.2, // Mock similarity score
          payload: doc
        }));

      return results;
    }

    // Real vector database implementation
    if (window.electronAPI?.vectorSearch) {
      const result = await window.electronAPI.vectorSearch(collection, query, limit);
      if (result.success) {
        return result.results;
      }
    }

    return [];
  }

  async getDocument(collection: string, documentId: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    if (this.isMockMode) {
      // Mock implementation - find in memory
      const docs = this.collections.get(collection) || [];
      return docs.find(doc => doc.id === documentId) || null;
    }

    // Real vector database implementation
    if (window.electronAPI?.vectorGetDocument) {
      const result = await window.electronAPI.vectorGetDocument(collection, documentId);
      if (result.success) {
        return result.result;
      }
    }

    return null;
  }

  async deleteDocument(collection: string, documentId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    if (this.isMockMode) {
      // Mock implementation - remove from memory
      const docs = this.collections.get(collection) || [];
      const index = docs.findIndex(doc => doc.id === documentId);
      if (index !== -1) {
        docs.splice(index, 1);
        return true;
      }
      return false;
    }

    // Real vector database implementation
    if (window.electronAPI?.vectorDeleteDocument) {
      const result = await window.electronAPI.vectorDeleteDocument(collection, documentId);
      return result.success;
    }

    return false;
  }

  async createCollection(collection: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    if (this.isMockMode) {
      // Mock implementation - create empty array
      if (!this.collections.has(collection)) {
        this.collections.set(collection, []);
      }
      return true;
    }

    // Real vector database implementation
    if (window.electronAPI?.vectorCreateCollection) {
      const result = await window.electronAPI.vectorCreateCollection(collection);
      return result.success;
    }

    return false;
  }

  async deleteCollection(collection: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    if (this.isMockMode) {
      // Mock implementation - remove from memory
      this.collections.delete(collection);
      return true;
    }

    // Real vector database implementation
    if (window.electronAPI?.vectorDeleteCollection) {
      const result = await window.electronAPI.vectorDeleteCollection(collection);
      return result.success;
    }

    return false;
  }

  async listCollections(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Vector database not initialized');
    }

    if (this.isMockMode) {
      // Mock implementation - return keys from memory
      return Array.from(this.collections.keys());
    }

    // Real vector database implementation
    if (window.electronAPI?.vectorListCollections) {
      const result = await window.electronAPI.vectorListCollections();
      if (result.success) {
        return result.collections;
      }
    }

    return [];
  }

  async close(): Promise<void> {
    this.isInitialized = false;
    this.collections.clear();
  }

  // Test helper methods
  _setMockMode(enabled: boolean): void {
    this.isMockMode = enabled;
  }

  _getCollection(collection: string): any[] {
    return this.collections.get(collection) || [];
  }

  _clearCollections(): void {
    this.collections.clear();
  }

  _addMockDocument(collection: string, document: any): void {
    if (!this.collections.has(collection)) {
      this.collections.set(collection, []);
    }
    this.collections.get(collection)!.push(document);
  }
}