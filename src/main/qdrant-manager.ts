/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

/**
 * Qdrant Manager for Electron Main Process
 *
 * 🎯 What It Is:
 * Manages the Qdrant vector database lifecycle within the Electron main process.
 * Handles server startup, shutdown, and IPC communication for Qdrant operations.
 *
 * ⚙️ How It Works:
 * - Starts Qdrant server when the application launches
 * - Provides IPC handlers for renderer process communication
 * - Manages graceful shutdown on application exit
 * - Handles error recovery and restart logic
 * - Monitors server health and status
 *
 * 🔗 Relationships:
 * - Used by main process for Qdrant lifecycle management
 * - Provides IPC interface to renderer process services
 * - Integrates with app lifecycle events
 */

import { app, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QdrantClient } from '@qdrant/qdrant-js';
import { createHash } from 'node:crypto';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inline Qdrant service for main process
class MainProcessQdrantService {
  private readonly client: any;
  private process: any = null;
  private readonly config: any;
  private isStarting = false;
  private isReady = false;
  private outputBuffer: string[] = [];
  private readonly maxOutputBufferSize = 1000; // 最大输出行数
  private outputCleanupInterval: NodeJS.Timeout | null = null;
  private processMonitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: Record<string, unknown>) {
    this.config = {
      host: '127.0.0.1',
      port: 6333,
      grpcPort: 6334,
      configPath: path.join(process.cwd(), 'external', 'qdrant', 'config.yaml'),
      dataPath: app.getPath('userData'),
      ...config,
    };

    this.client = new QdrantClient({
      host: String(this.config.host),
      port: Number(this.config.port),
    });
  }

  private handleOutput(data: Buffer, isError = false): void {
    const output = data.toString().trim();
    if (!output) return;

    // 只记录错误信息
    if (isError) {
      console.error(`Qdrant error: ${output}`);
    }

    // 添加到缓冲区
    this.outputBuffer.push(output);

    // 缓冲区管理 - 如果超过限制，立即清理一半
    if (this.outputBuffer.length > this.maxOutputBufferSize) {
      const removeCount = Math.floor(this.maxOutputBufferSize / 2);
      this.outputBuffer.splice(0, removeCount);
    }
  }

  private startOutputCleanup(): void {
    // 定期清理输出缓冲区
    this.outputCleanupInterval = setInterval(() => {
      if (this.outputBuffer.length > this.maxOutputBufferSize / 2) {
        this.outputBuffer.splice(0, Math.floor(this.maxOutputBufferSize / 2));
      }
    }, 60000); // 每分钟清理一次
  }

  private stopOutputCleanup(): void {
    if (this.outputCleanupInterval) {
      clearInterval(this.outputCleanupInterval);
      this.outputCleanupInterval = null;
    }
  }

  private startProcessMonitoring(): void {
    if (!this.process?.pid) {
      return;
    }

    this.processMonitoringInterval = setInterval(async () => {
      if (!this.process?.pid) {
        return;
      }

      try {
        const { exec } = await import('child_process');

        const childProcess = exec(
          `wmic process where ProcessId=${this.process.pid} get PageFileUsage,WorkingSetSize /format:list`,
          { timeout: 10000 },
          (_error, stdout) => {
            try {
              // 只在开发模式下输出监控信息
              if (process.env.NODE_ENV === 'development' && stdout) {
                const lines = stdout.trim().split('\n');
                const memoryUsage: any = {};

                lines.forEach((line) => {
                  if (line.includes('PageFileUsage=')) {
                    memoryUsage.pageFileUsage = parseInt(line.split('=')[1]) / 1024 / 1024;
                  }
                  if (line.includes('WorkingSetSize=')) {
                    memoryUsage.workingSetSize = parseInt(line.split('=')[1]) / 1024 / 1024;
                  }
                });

                if (memoryUsage.pageFileUsage || memoryUsage.workingSetSize) {
                  console.log(
                    `Qdrant PID:${this.process.pid} | PF:${memoryUsage.pageFileUsage?.toFixed(1)}MB | WS:${memoryUsage.workingSetSize?.toFixed(1)}MB`,
                  );
                }
              }
            } finally {
              // 确保子进程被正确清理
              if (childProcess?.pid) {
                childProcess.kill();
                childProcess.unref();
              }
            }
          },
        );

        childProcess.on('timeout', () => {
          childProcess.kill();
        });
      } catch (_error) {
        // 静默处理监控错误
      }
    }, 30000); // 每30秒监控一次
  }

  private stopProcessMonitoring(): void {
    if (this.processMonitoringInterval) {
      clearInterval(this.processMonitoringInterval);
      this.processMonitoringInterval = null;
    }
  }

  async start(): Promise<void> {
    if (this.process || this.isStarting) {
      return;
    }

    this.isStarting = true;
    this.outputBuffer = []; // 重置缓冲区

    try {
      const { spawn } = await import('child_process');
      const fs = await import('fs/promises');

      await fs.mkdir(this.config.dataPath, { recursive: true });
      const qdrantPath = path.join(process.cwd(), 'external', 'qdrant', 'qdrant.exe');

      try {
        await fs.access(qdrantPath);
      } catch (_error) {
        throw new Error(`Qdrant binary not found at ${qdrantPath}`);
      }

      this.process = spawn(qdrantPath, ['--config-path', this.config.configPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(qdrantPath),
      });

      // 启动进程监控
      if (this.process?.pid) {
        this.startProcessMonitoring();
      }

      // 使用新的输出处理方法
      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleOutput(data, false);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.handleOutput(data, true);
      });

      this.process.on('exit', (code: number | null) => {
        console.log(`Qdrant process exited with code ${code}`);
        this.stopOutputCleanup(); // 停止清理定时器
        this.process = null;
        this.isReady = false;
      });

      // 启动输出清理定时器
      this.startOutputCleanup();

      await this.waitForReady();
      this.isReady = true;
      console.log('Qdrant service started successfully');
    } catch (error) {
      this.isStarting = false;
      throw error;
    }

    this.isStarting = false;
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (this.process) {
        // 停止输出清理定时器
        this.stopOutputCleanup();
        // 停止进程监控
        this.stopProcessMonitoring();

        // Remove ALL event listeners to prevent memory leaks
        this.process.removeAllListeners('exit');
        this.process.removeAllListeners('error');
        this.process.removeAllListeners('close');
        this.process.stdout?.removeAllListeners();
        this.process.stderr?.removeAllListeners();

        // 清理输出缓冲区
        this.outputBuffer = [];

        // Add proper exit handler
        this.process.once('exit', () => {
          this.process = null;
          this.isReady = false;
          this.isStarting = false;
          resolve();
        });

        this.process.kill('SIGTERM');

        // Force kill after timeout if process doesn't exit
        setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
            this.process = null;
            this.isReady = false;
            this.isStarting = false;
            resolve();
          }
        }, 10000); // 10 second timeout
      } else {
        resolve();
      }
    });
  }

  private async waitForReady(maxRetries = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.client.getCollections();
        return;
      } catch (_error) {
        // Server not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Qdrant server failed to start within timeout period');
  }

  isServiceReady(): boolean {
    return this.isReady;
  }

  async createCollection(name: string, vectorSize: number, distance = 'Cosine'): Promise<void> {
    const payload = {
      vectors: {
        size: vectorSize,
        distance: distance,
      },
    };
    await this.client.createCollection(name, payload);
  }

  async getCollectionInfo(name: string): Promise<any> {
    const info = await this.client.getCollection(name);
    return info;
  }

  async ensureCollection(name: string, vectorSize: number, distance = 'Cosine'): Promise<void> {
    try {
      const info = await this.getCollectionInfo(name);
      const cfg = info?.config ?? info;
      const params = cfg?.params ?? cfg;
      const vectors = params?.vectors ?? cfg?.vectors;
      const currentSize = typeof vectors?.size === 'number' ? vectors.size : undefined;
      const currentDistance = typeof vectors?.distance === 'string' ? vectors.distance : undefined;

      if (!currentSize || currentSize !== vectorSize || (currentDistance && currentDistance !== distance)) {
        try {
          await this.deleteCollection(name);
        } catch (_e) {
          // ignore delete failure and proceed
        }
        await this.createCollection(name, vectorSize, distance);
        return;
      }
    } catch (_error) {
      await this.createCollection(name, vectorSize, distance);
    }
  }

  async listCollections(): Promise<
    Array<{
      name: string;
      vectors_count: number;
      points_count: number;
      status: string;
      optimizer_status: string;
    }>
    > {
    const res = await this.client.getCollections();
    return res.collections.map((col: any) => ({
      name: col.name,
      vectors_count: col.vectors_count || 0,
      points_count: col.points_count || 0,
      status: col.status,
      optimizer_status: col.optimizer_status?.status || 'unknown',
    }));
  }

  async deleteCollection(name: string): Promise<void> {
    await this.client.deleteCollection(name);
  }

  async upsertVectors(collectionName: string, points: any[]): Promise<void> {
    const normalized = points.map((p: any) => ({ ...p, id: this.normalizePointId(p?.id) }));
    const payload = { points: normalized };
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      try {
        const healthy = await this.getHealth();
        if (!healthy) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        await this.client.upsert(collectionName, payload);
        return;
      } catch (error: any) {
        lastError = error;
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }

    throw lastError;
  }

  async searchVectors(
    collectionName: string,
    queryVector: number[],
    limit = 10,
    scoreThreshold = 0.7,
    filter?: any,
  ): Promise<any[]> {
    const payload: any = {
      vector: queryVector,
      limit: limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    };

    if (filter) {
      payload.filter = filter;
    }

    const result = await this.client.search(collectionName, payload);
    return result.map((r: any) => ({ id: r.id, score: r.score, payload: r.payload }));
  }

  async getVectors(collectionName: string, ids: any[]): Promise<any[]> {
    const payload = {
      ids: ids.map((id) => this.normalizePointId(id)),
      with_payload: true,
      with_vector: true,
    };

    const result = await this.client.retrieve(collectionName, payload);
    return result.map((point: any) => ({ id: point.id, vector: point.vector, payload: point.payload }));
  }

  async deleteVectors(collectionName: string, ids: any[]): Promise<void> {
    const payload = { points: ids.map((id) => this.normalizePointId(id)) };
    await this.client.delete(collectionName, payload);
  }

  async clearCollection(collectionName: string): Promise<void> {
    const batchSize = 1000;
    let offset: any = undefined;
    let done = false;
    while (!done) {
      const page = await this.client.scroll(collectionName, {
        limit: batchSize,
        with_payload: false,
        with_vector: false,
        offset,
      });
      const ids = page.points?.map((p: any) => p.id) ?? [];
      if (ids.length > 0) {
        await this.client.delete(collectionName, { points: ids });
      }
      if (!page.next_page_offset) {
        done = true;
      } else {
        offset = page.next_page_offset;
      }
    }
  }

  private uuidFromString(s: string): string {
    const buf = createHash('sha256').update(String(s)).digest();
    const bytes = Buffer.from(buf.slice(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private normalizePointId(id: any): any {
    if (typeof id === 'number' && Number.isInteger(id) && id >= 0) {
      return id;
    }
    if (typeof id === 'string') {
      const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (v4.test(id)) return id;
      return this.uuidFromString(id);
    }
    return this.uuidFromString(String(id));
  }

  async getHealth(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async getMetrics(): Promise<any> {
    const url = `http://${this.config.host}:${this.config.port}/metrics`;
    const res = await fetch(url);
    return await res.text();
  }
}

// Inline Knowledge service for main process
class MainProcessKnowledgeService {
  private readonly qdrantService: MainProcessQdrantService;
  private readonly COLLECTIONS = {
    KNOWLEDGE: 'knowledge_items',
    CONVERSATIONS: 'conversations',
    RESOURCES: 'learning_resources',
    EMBEDDINGS: 'content_embeddings',
  };
  private readonly VECTOR_SIZE = 1536;

  constructor(qdrantService: MainProcessQdrantService) {
    this.qdrantService = qdrantService;
  }

  async initializeCollections(): Promise<void> {
    try {
      const maxWait = 30;
      let attempts = 0;

      while (!this.qdrantService.isServiceReady() && attempts < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!this.qdrantService.isServiceReady()) {
        console.warn('Qdrant service not ready, skipping collection initialization');
        return;
      }

      for (const collectionName of Object.values(this.COLLECTIONS)) {
        try {
          await this.qdrantService.ensureCollection(
            collectionName,
            this.VECTOR_SIZE,
            'Cosine',
          );
          console.log(`Ensured Qdrant collection: ${collectionName}`);
        } catch (error: any) {
          console.error(
            `Failed to ensure collection ${collectionName}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    } catch (error) {
      console.error('Failed to initialize Qdrant collections:', error);
    }
  }

  async addKnowledgeItem(item: any, provider: any, embedding?: number[]): Promise<void> {
    try {
      if (!embedding) {
        embedding = new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());
      }

      const vectorPoint = {
        id: item.id,
        vector: embedding,
        payload: {
          ...item,
          embedding: undefined,
        },
      };

      await this.qdrantService.upsertVectors(this.COLLECTIONS.KNOWLEDGE, [vectorPoint]);
      console.log(`Added knowledge item: ${item.id}`);
    } catch (error) {
      console.error('Failed to add knowledge item:', error);
      throw error;
    }
  }

  async searchKnowledge(query: string, provider: any, limit = 10, filters?: any): Promise<any[]> {
    try {
      const queryEmbedding = new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());

      const filter: any = {};
      if (filters?.type) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'type',
          match: { value: filters.type },
        });
      }
      if (filters?.topic) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'metadata.topic',
          match: { value: filters.topic },
        });
      }
      if (filters?.sessionId) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'metadata.sessionId',
          match: { value: filters.sessionId },
        });
      }
      if (filters?.tags?.length) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'metadata.tags',
          match: { any: filters.tags },
        });
      }

      const searchResults = await this.qdrantService.searchVectors(
        this.COLLECTIONS.KNOWLEDGE,
        queryEmbedding,
        limit,
        0.6,
        filter,
      );

      return searchResults.map((result) => ({
        item: result.payload,
        similarity: result.score,
        relevance: this.calculateRelevance(result.score),
      }));
    } catch (error) {
      console.error('Failed to search knowledge:', error);
      return [];
    }
  }

  async getKnowledgeItem(id: string): Promise<any> {
    try {
      const vectors = await this.qdrantService.getVectors(this.COLLECTIONS.KNOWLEDGE, [id]);
      if (vectors.length === 0) {
        return null;
      }
      return vectors[0].payload;
    } catch (error) {
      console.error('Failed to get knowledge item:', error);
      return null;
    }
  }

  async updateKnowledgeItem(id: string, updates: any, provider: any): Promise<void> {
    try {
      const existingItem = await this.getKnowledgeItem(id);
      if (!existingItem) {
        throw new Error(`Knowledge item not found: ${id}`);
      }

      const updatedItem = { ...existingItem, ...updates };
      const embedding = new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());

      const vectorPoint = {
        id: id,
        vector: embedding,
        payload: updatedItem,
      };

      await this.qdrantService.upsertVectors(this.COLLECTIONS.KNOWLEDGE, [vectorPoint]);
      console.log(`Updated knowledge item: ${id}`);
    } catch (error) {
      console.error('Failed to update knowledge item:', error);
      throw error;
    }
  }

  async deleteKnowledgeItem(id: string): Promise<void> {
    try {
      await this.qdrantService.deleteVectors(this.COLLECTIONS.KNOWLEDGE, [id]);
      console.log(`Deleted knowledge item: ${id}`);
    } catch (error) {
      console.error('Failed to delete knowledge item:', error);
      throw error;
    }
  }

  async storeConversationContext(sessionId: string, messages: any[], provider: any): Promise<void> {
    try {
      const conversationText = messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
      const embedding = new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());

      const vectorPoint = {
        id: `conversation_${sessionId}`,
        vector: embedding,
        payload: {
          sessionId,
          messages,
          timestamp: Date.now(),
          type: 'conversation',
        },
      };

      await this.qdrantService.upsertVectors(this.COLLECTIONS.CONVERSATIONS, [vectorPoint]);
    } catch (error) {
      console.error('Failed to store conversation context:', error);
    }
  }

  async getRelevantContext(
    sessionId: string,
    query: string,
    provider: any,
    limit = 5,
  ): Promise<string[]> {
    try {
      const queryEmbedding = new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());

      const searchResults = await this.qdrantService.searchVectors(
        this.COLLECTIONS.CONVERSATIONS,
        queryEmbedding,
        limit,
        0.5,
        { must: [{ key: 'sessionId', match: { value: sessionId } }] },
      );

      return searchResults.map((result) => {
        const payload = result.payload;
        return payload.messages?.map((msg: any) => msg.content).join('\n') || '';
      });
    } catch (error) {
      console.error('Failed to get relevant context:', error);
      return [];
    }
  }

  async getKnowledgeStats(): Promise<any> {
    try {
      const collections = await this.qdrantService.listCollections();
      const knowledgeCollection = collections.find(
        (col) => col.name === this.COLLECTIONS.KNOWLEDGE,
      );

      return {
        totalItems: knowledgeCollection?.points_count || 0,
        itemsByType: {},
        itemsByTopic: {},
      };
    } catch (error) {
      console.error('Failed to get knowledge stats:', error);
      return {
        totalItems: 0,
        itemsByType: {},
        itemsByTopic: {},
      };
    }
  }

  async clearAllKnowledge(): Promise<void> {
    try {
      await this.qdrantService.clearCollection(this.COLLECTIONS.KNOWLEDGE);
      await this.qdrantService.clearCollection(this.COLLECTIONS.CONVERSATIONS);
      console.log('Cleared all knowledge data');
    } catch (error) {
      console.error('Failed to clear knowledge data:', error);
      throw error;
    }
  }

  private calculateRelevance(similarity: number): string {
    if (similarity >= 0.9) return 'Very High';
    if (similarity >= 0.8) return 'High';
    if (similarity >= 0.7) return 'Medium';
    if (similarity >= 0.6) return 'Low';
    return 'Very Low';
  }
}

export const createQdrantManager = () => {
  const qdrantService = new MainProcessQdrantService();
  const knowledgeService = new MainProcessKnowledgeService(qdrantService);
  let isInitialized = false;
  let ipcHandlersRegistered = false;

  const initialize = async (): Promise<void> => {
    if (isInitialized) {
      return;
    }
    try {
      await qdrantService.start();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await (knowledgeService as any)['initializeCollections']?.();
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Qdrant service:', error);
      throw error;
    }
  };

  const shutdown = async (): Promise<void> => {
    if (!isInitialized) {
      return;
    }
    try {
      await qdrantService.stop();
      isInitialized = false;
    } catch (error) {
      console.error('Failed to shutdown Qdrant service:', error);
    }
  };

  const isReady = (): boolean => {
    return isInitialized && qdrantService.isServiceReady();
  };

  const addKnowledgeItem = async (
    item: any,
    provider: any,
    embedding?: number[],
  ): Promise<void> => {
    return await knowledgeService.addKnowledgeItem(item, provider, embedding);
  };

  const searchKnowledge = async (
    query: string,
    provider: any,
    limit = 10,
    filters?: any,
  ): Promise<any[]> => {
    return await knowledgeService.searchKnowledge(query, provider, limit, filters);
  };

  const deleteKnowledgeItem = async (id: string): Promise<void> => {
    return await knowledgeService.deleteKnowledgeItem(id);
  };

  const getKnowledgeStats = async (): Promise<any> => {
    return await knowledgeService.getKnowledgeStats();
  };

  const listCollections = async (): Promise<any[]> => {
    return await qdrantService.listCollections();
  };

  const cleanup = (): void => {
    try {
      const ipcHandlers = [
        'qdrant:start',
        'qdrant:stop',
        'qdrant:status',
        'knowledge:add',
        'knowledge:search',
        'knowledge:get',
        'knowledge:update',
        'knowledge:delete',
        'knowledge:storeContext',
        'knowledge:getContext',
        'knowledge:stats',
        'knowledge:clear',
        'qdrant:collections',
        'qdrant:createCollection',
        'qdrant:deleteCollection',
      ];
      ipcHandlers.forEach((handler) => {
        try {
          ipcMain.removeAllListeners(handler);
        } catch (_error) {
          console.warn(`Failed to remove IPC handler ${handler}:`, _error);
        }
      });
      ipcHandlersRegistered = false;
    } catch (error) {
      console.error('Error during Qdrant manager cleanup:', error);
    }
  };

  const setupIpcHandlers = (): void => {
    if (ipcHandlersRegistered) return;
    ipcMain.handle('qdrant:start', async () => {
      try {
        await initialize();
        return { success: true };
      } catch (error) {
        console.error('Failed to start Qdrant:', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        };
      }
    });
    ipcMain.handle('qdrant:stop', async () => {
      try {
        await shutdown();
        return { success: true };
      } catch (error) {
        console.error('Failed to stop Qdrant:', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        };
      }
    });
    ipcMain.handle('qdrant:status', async () => {
      try {
        const health = await qdrantService.getHealth();
        const metrics = await qdrantService.getMetrics();
        const collections = await qdrantService.listCollections();
        return {
          success: true,
          status: {
            ready: isReady(),
            health,
            metrics,
            collections: collections.map((col) => ({
              name: col.name,
              points: col.points_count,
              vectors: col.vectors_count,
            })),
          },
        };
      } catch (error) {
        console.error('Failed to get Qdrant status:', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error),
        };
      }
    });
    ipcMain.handle('qdrant:knowledge:add', async (_, { item, embedding, provider }) => {
      try {
        await knowledgeService.addKnowledgeItem(item, provider, embedding);
        return { success: true };
      } catch (error) {
        console.error('Failed to add knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:search', async (_, { query, provider, limit, filters }) => {
      try {
        const results = await knowledgeService.searchKnowledge(query, provider, limit, filters);
        return { success: true, results };
      } catch (error) {
        console.error('Failed to search knowledge:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:get', async (_, { id }) => {
      try {
        const item = await knowledgeService.getKnowledgeItem(id);
        return { success: true, item };
      } catch (error) {
        console.error('Failed to get knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:update', async (_, { id, updates, provider }) => {
      try {
        await knowledgeService.updateKnowledgeItem(id, updates, provider);
        return { success: true };
      } catch (error) {
        console.error('Failed to update knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:delete', async (_, { id }) => {
      try {
        await knowledgeService.deleteKnowledgeItem(id);
        return { success: true };
      } catch (error) {
        console.error('Failed to delete knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:storeContext', async (_, { sessionId, messages, provider }) => {
      try {
        await knowledgeService.storeConversationContext(sessionId, messages, provider);
        return { success: true };
      } catch (error) {
        console.error('Failed to store conversation context:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:getContext', async (_, { sessionId, query, provider, limit }) => {
      try {
        const context = await knowledgeService.getRelevantContext(
          sessionId,
          query,
          provider,
          limit,
        );
        return { success: true, context };
      } catch (error) {
        console.error('Failed to get relevant context:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:stats', async () => {
      try {
        const stats = await knowledgeService.getKnowledgeStats();
        return { success: true, stats };
      } catch (error) {
        console.error('Failed to get knowledge stats:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:knowledge:clear', async () => {
      try {
        await knowledgeService.clearAllKnowledge();
        return { success: true };
      } catch (error) {
        console.error('Failed to clear knowledge:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:collections', async () => {
      try {
        const collections = await qdrantService.listCollections();
        return { success: true, collections };
      } catch (error) {
        console.error('Failed to list collections:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:createCollection', async (_, { name, vectorSize, distance }) => {
      try {
        await qdrantService.createCollection(name, vectorSize, distance);
        return { success: true };
      } catch (error) {
        console.error('Failed to create collection:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcMain.handle('qdrant:deleteCollection', async (_, { name }) => {
      try {
        await qdrantService.deleteCollection(name);
        return { success: true };
      } catch (error) {
        console.error('Failed to delete collection:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    ipcHandlersRegistered = true;
  };

  setupIpcHandlers();

  return {
    initialize,
    shutdown,
    isReady,
    addKnowledgeItem,
    searchKnowledge,
    deleteKnowledgeItem,
    getKnowledgeStats,
    listCollections,
    cleanup,
  };
};

export type QdrantManager = ReturnType<typeof createQdrantManager>;
