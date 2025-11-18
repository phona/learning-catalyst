/**
 * Qdrant Service
 *
 * 🎯 What It Is:
 * Service layer for managing Qdrant vector database operations within Learning Catalyst.
 * Handles vector storage, similarity search, and collection management for knowledge graphs.
 *
 * ⚙️ How It Works:
 * - Manages Qdrant server lifecycle through Electron main process
 * - Provides HTTP client interface for Qdrant REST API
 * - Handles vector operations (create, search, update, delete)
 * - Manages collections for different data types (knowledge, sessions, embeddings)
 * - Implements error handling and retry logic
 *
 * 🔗 Relationships:
 * - Used by KnowledgeService for vector storage operations
 * - Integrated with Electron main process for server management
 * - Consumed by AI services for embedding-based recommendations
 * - Provides data to AnalyticsService for similarity metrics
 */

import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface QdrantConfig {
  host: string;
  port: number;
  grpcPort: number;
  configPath: string;
  dataPath: string;
}

export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, any>;
}

export interface CollectionInfo {
  name: string;
  vectors_count: number;
  points_count: number;
  status: string;
  optimizer_status: string;
}

export class QdrantService {
  private readonly client: AxiosInstance;
  private process: ChildProcess | null = null;
  private readonly config: QdrantConfig;
  private isStarting: boolean = false;
  private isReady: boolean = false;

  constructor(config?: Partial<QdrantConfig>) {
    const isDev = process.env.NODE_ENV === 'development';

    this.config = {
      host: '127.0.0.1',
      port: 6333,
      grpcPort: 6334,
      configPath: path.join(process.cwd(), 'external', 'qdrant', 'config.yaml'),
      dataPath: path.join(app.getPath('userData'), 'qdrant-data'),
      ...config
    };

    this.client = axios.create({
      baseURL: `http://${this.config.host}:${this.config.port}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Qdrant service error:', error.message);
        throw error;
      }
    );
  }

  /**
   * Start Qdrant server
   */
  async start(): Promise<void> {
    if (this.process || this.isStarting) {
      return;
    }

    this.isStarting = true;

    try {
      // Ensure data directory exists
      await fs.mkdir(this.config.dataPath, { recursive: true });

      // Get path to Qdrant binary
      const qdrantPath = path.join(process.cwd(), 'external', 'qdrant', 'qdrant.exe');

      // Check if binary exists
      try {
        await fs.access(qdrantPath);
      } catch (error) {
        throw new Error(`Qdrant binary not found at ${qdrantPath}`);
      }

      // Start Qdrant process
      this.process = spawn(qdrantPath, [
        '--config-path', this.config.configPath
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(qdrantPath)
      });

      // Handle process output
      this.process.stdout?.on('data', (data) => {
        console.log(`Qdrant: ${data.toString().trim()}`);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`Qdrant error: ${data.toString().trim()}`);
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        console.log(`Qdrant process exited with code ${code}`);
        this.process = null;
        this.isReady = false;
      });

      // Wait for server to be ready
      await this.waitForReady();

      this.isReady = true;
      console.log('Qdrant service started successfully');

    } catch (error) {
      this.isStarting = false;
      throw error;
    }

    this.isStarting = false;
  }

  /**
   * Stop Qdrant server
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (this.process) {
        this.process.on('exit', () => {
          this.process = null;
          this.isReady = false;
          resolve();
        });

        this.process.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
            this.process = null;
            this.isReady = false;
            resolve();
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if Qdrant is ready
   */
  private async waitForReady(maxRetries: number = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.client.get('/health');
        if (response.status === 200) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Qdrant server failed to start within timeout period');
  }

  /**
   * Check if service is ready
   */
  isServiceReady(): boolean {
    return this.isReady;
  }

  /**
   * Create a new collection
   */
  async createCollection(
    name: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
  ): Promise<void> {
    const payload = {
      vectors: {
        size: vectorSize,
        distance: distance
      }
    };

    await this.client.put(`/collections/${name}`, payload);
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    await this.client.delete(`/collections/${name}`);
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<CollectionInfo[]> {
    const response = await this.client.get('/collections');
    return response.data.collections.map((col: any) => ({
      name: col.name,
      vectors_count: col.vectors_count || 0,
      points_count: col.points_count || 0,
      status: col.status,
      optimizer_status: col.optimizer_status?.status || 'unknown'
    }));
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(name: string): Promise<CollectionInfo | null> {
    try {
      const response = await this.client.get(`/collections/${name}`);
      const result = response.data.result;

      return {
        name: result.name,
        vectors_count: result.vectors_count || 0,
        points_count: result.points_count || 0,
        status: result.status,
        optimizer_status: result.optimizer_status?.status || 'unknown'
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Add or update vectors in a collection
   */
  async upsertVectors(collectionName: string, points: VectorPoint[]): Promise<void> {
    const payload = {
      points: points
    };

    await this.client.put(`/collections/${collectionName}/points`, payload);
  }

  /**
   * Search for similar vectors
   */
  async searchVectors(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.7,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    const payload: any = {
      vector: queryVector,
      limit: limit,
      score_threshold: scoreThreshold,
      with_payload: true
    };

    if (filter) {
      payload.filter = filter;
    }

    const response = await this.client.post(`/collections/${collectionName}/points/search`, payload);
    return response.data.result.map((result: any) => ({
      id: result.id,
      score: result.score,
      payload: result.payload
    }));
  }

  /**
   * Get vectors by IDs
   */
  async getVectors(collectionName: string, ids: (string | number)[]): Promise<VectorPoint[]> {
    const payload = {
      ids: ids,
      with_payload: true,
      with_vector: true
    };

    const response = await this.client.post(`/collections/${collectionName}/points`, payload);
    return response.data.result.map((point: any) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload
    }));
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(collectionName: string, ids: (string | number)[]): Promise<void> {
    const payload = {
      points: ids
    };

    await this.client.post(`/collections/${collectionName}/points/delete`, payload);
  }

  /**
   * Count points in collection
   */
  async countPoints(collectionName: string): Promise<number> {
    const response = await this.client.get(`/collections/${collectionName}/points/count`);
    return response.data.result.count;
  }

  /**
   * Clear all points in collection
   */
  async clearCollection(collectionName: string): Promise<void> {
    const payload = {
      points: {
        all: true
      }
    };

    await this.client.post(`/collections/${collectionName}/points/delete`, payload);
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    const response = await this.client.get('/metrics');
    return response.data;
  }
}

// Singleton instance
let qdrantService: QdrantService | null = null;

export function getQdrantService(): QdrantService {
  if (!qdrantService) {
    qdrantService = new QdrantService();
  }
  return qdrantService;
}

export default QdrantService;