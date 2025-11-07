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
import axios from 'axios';

// For CommonJS compatibility, use __dirname directly if available, otherwise calculate it
const __dirname = path.dirname(__filename);

// Inline Qdrant service for main process
class MainProcessQdrantService {
  private client: any;
  private process: any = null;
  private config: any;
  private isStarting: boolean = false;
  private isReady: boolean = false;
  private outputBuffer: string[] = [];
  private maxOutputBufferSize = 1000; // 最大输出行数
  private outputCleanupInterval: NodeJS.Timeout | null = null;
  private processMonitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: any) {
    this.config = {
      host: '127.0.0.1',
      port: 6333,
      grpcPort: 6334,
      configPath: path.join(process.cwd(), 'external', 'qdrant', 'config.yaml'),
      dataPath: app.getPath('userData'),
      ...config
    };

      this.client = axios.create({
      baseURL: `http://${this.config.host}:${this.config.port}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      },
      // 添加连接池配置防止内存泄漏
      maxRedirects: 5
    });

    // 设置HTTP agents来控制连接池
    this.setupHttpAgents();
  }

  private async setupHttpAgents(): Promise<void> {
    try {
      const { default: http } = await import('http');
      const { default: https } = await import('https');

      // 设置HTTP agent限制连接池大小
      const httpAgent = new http.Agent({
        keepAlive: true,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 30000
      });

      const httpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 30000
      });

      this.client.defaults.httpAgent = httpAgent;
      this.client.defaults.httpsAgent = httpsAgent;

      // 添加响应拦截器来确保连接正确释放
      this.client.interceptors.response.use(
        (response: any) => {
          // 确保响应完成后释放连接
          if (response.socket) {
            response.socket.destroy();
          }
          return response;
        },
        (error: any) => {
          // 确保错误时也释放连接
          if (error.socket) {
            error.socket.destroy();
          }
          throw error;
        }
      );
    } catch (error) {
      console.warn('Failed to set up HTTP agents:', error);
    }
  }

  private handleOutput(data: Buffer, isError: boolean = false): void {
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
    if (!this.process || !this.process.pid) {
      return;
    }

    this.processMonitoringInterval = setInterval(async () => {
      if (!this.process || !this.process.pid) {
        return;
      }

      try {
        const { exec } = await import('child_process');

        const childProcess = exec(`wmic process where ProcessId=${this.process.pid} get PageFileUsage,WorkingSetSize /format:list`,
          { timeout: 10000 },
          (_error, stdout) => {
          try {
            // 只在开发模式下输出监控信息
            if (process.env.NODE_ENV === 'development' && stdout) {
              const lines = stdout.trim().split('\n');
              const memoryUsage: any = {};

              lines.forEach(line => {
                if (line.includes('PageFileUsage=')) {
                  memoryUsage.pageFileUsage = parseInt(line.split('=')[1]) / 1024 / 1024;
                }
                if (line.includes('WorkingSetSize=')) {
                  memoryUsage.workingSetSize = parseInt(line.split('=')[1]) / 1024 / 1024;
                }
              });

              if (memoryUsage.pageFileUsage || memoryUsage.workingSetSize) {
                console.log(`Qdrant PID:${this.process.pid} | PF:${memoryUsage.pageFileUsage?.toFixed(1)}MB | WS:${memoryUsage.workingSetSize?.toFixed(1)}MB`);
              }
            }
          } finally {
            // 确保子进程被正确清理
            if (childProcess && childProcess.pid) {
              childProcess.kill();
              childProcess.unref();
            }
          }
        });

        childProcess.on('timeout', () => {
          childProcess.kill();
        });

      } catch (error) {
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
      } catch (error) {
        throw new Error(`Qdrant binary not found at ${qdrantPath}`);
      }

      this.process = spawn(qdrantPath, [
        '--config-path', this.config.configPath
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.dirname(qdrantPath)
      });

      // 启动进程监控
      if (this.process && this.process.pid) {
        this.startProcessMonitoring();
      }

      // 使用新的输出处理方法
      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleOutput(data, false);
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        this.handleOutput(data, true);
      });

      this.process.on('exit', (code: any) => {
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
        this.process.removeAllListeners('exit')
        this.process.removeAllListeners('error')
        this.process.removeAllListeners('close')
        this.process.stdout?.removeAllListeners()
        this.process.stderr?.removeAllListeners()

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

  private async waitForReady(maxRetries: number = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try different health endpoints
        const endpoints = ['/health', '/', '/collections'];
        for (const endpoint of endpoints) {
          try {
            const response = await this.client.get(endpoint);
            if (response.status === 200) {
              console.log(`Qdrant health check passed via ${endpoint}`);
              return;
            }
          } catch (endpointError) {
            // Try next endpoint
          }
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Qdrant server failed to start within timeout period');
  }

  isServiceReady(): boolean {
    return this.isReady;
  }

  async createCollection(name: string, vectorSize: number, distance: string = 'Cosine'): Promise<void> {
    const payload = {
      vectors: {
        size: vectorSize,
        distance: distance
      }
    };
    await this.client.put(`/collections/${name}`, payload);
  }

  async listCollections(): Promise<any[]> {
    const response = await this.client.get('/collections');
    return response.data.collections.map((col: any) => ({
      name: col.name,
      vectors_count: col.vectors_count || 0,
      points_count: col.points_count || 0,
      status: col.status,
      optimizer_status: col.optimizer_status?.status || 'unknown'
    }));
  }

  async deleteCollection(name: string): Promise<void> {
    await this.client.delete(`/collections/${name}`);
  }

  async upsertVectors(collectionName: string, points: any[]): Promise<void> {
    const payload = { points };
    await this.client.put(`/collections/${collectionName}/points`, payload);
  }

  async searchVectors(collectionName: string, queryVector: number[], limit: number = 10, scoreThreshold: number = 0.7, filter?: any): Promise<any[]> {
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

  async getVectors(collectionName: string, ids: any[]): Promise<any[]> {
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

  async deleteVectors(collectionName: string, ids: any[]): Promise<void> {
    const payload = { points: ids };
    await this.client.post(`/collections/${collectionName}/points/delete`, payload);
  }

  async clearCollection(collectionName: string): Promise<void> {
    const payload = {
      points: { all: true }
    };
    await this.client.post(`/collections/${collectionName}/points/delete`, payload);
  }

  async getHealth(): Promise<boolean> {
    try {
      // Try different health endpoints
      const endpoints = ['/health', '/', '/collections'];
      for (const endpoint of endpoints) {
        try {
          const response = await this.client.get(endpoint);
          if (response.status === 200) {
            return true;
          }
        } catch (endpointError) {
          // Try next endpoint
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async getMetrics(): Promise<any> {
    const response = await this.client.get('/metrics');
    return response.data;
  }
}

// Inline Knowledge service for main process
class MainProcessKnowledgeService {
  private qdrantService: MainProcessQdrantService;
  private readonly COLLECTIONS = {
    KNOWLEDGE: 'knowledge_items',
    CONVERSATIONS: 'conversations',
    RESOURCES: 'learning_resources',
    EMBEDDINGS: 'content_embeddings'
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (!this.qdrantService.isServiceReady()) {
        console.warn('Qdrant service not ready, skipping collection initialization');
        return;
      }

      for (const collectionName of Object.values(this.COLLECTIONS)) {
        try {
          await this.qdrantService.createCollection(collectionName, this.VECTOR_SIZE, 'Cosine');
          console.log(`Created Qdrant collection: ${collectionName}`);
        } catch (error: any) {
          if (!error.response?.data?.status?.error?.includes('already exists')) {
            console.error(`Failed to create collection ${collectionName}:`, error instanceof Error ? error.message : String(error));
          }
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
          embedding: undefined
        }
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
          match: { value: filters.type }
        });
      }
      if (filters?.topic) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'metadata.topic',
          match: { value: filters.topic }
        });
      }
      if (filters?.sessionId) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'metadata.sessionId',
          match: { value: filters.sessionId }
        });
      }
      if (filters?.tags?.length) {
        filter.must = filter.must || [];
        filter.must.push({
          key: 'metadata.tags',
          match: { any: filters.tags }
        });
      }

      const searchResults = await this.qdrantService.searchVectors(
        this.COLLECTIONS.KNOWLEDGE,
        queryEmbedding,
        limit,
        0.6,
        filter
      );

      return searchResults.map(result => ({
        item: result.payload,
        similarity: result.score,
        relevance: this.calculateRelevance(result.score)
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
        payload: updatedItem
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
      const conversationText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const embedding = new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());

      const vectorPoint = {
        id: `conversation_${sessionId}`,
        vector: embedding,
        payload: {
          sessionId,
          messages,
          timestamp: Date.now(),
          type: 'conversation'
        }
      };

      await this.qdrantService.upsertVectors(this.COLLECTIONS.CONVERSATIONS, [vectorPoint]);
    } catch (error) {
      console.error('Failed to store conversation context:', error);
    }
  }

  async getRelevantContext(sessionId: string, query: string, provider: any, limit = 5): Promise<string[]> {
    try {
      const queryEmbedding = new Array(this.VECTOR_SIZE).fill(0).map(() => Math.random());

      const searchResults = await this.qdrantService.searchVectors(
        this.COLLECTIONS.CONVERSATIONS,
        queryEmbedding,
        limit,
        0.5,
        { sessionId: sessionId }
      );

      return searchResults.map(result => {
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
      const knowledgeCollection = collections.find(col => col.name === this.COLLECTIONS.KNOWLEDGE);

      return {
        totalItems: knowledgeCollection?.points_count || 0,
        itemsByType: {},
        itemsByTopic: {}
      };
    } catch (error) {
      console.error('Failed to get knowledge stats:', error);
      return {
        totalItems: 0,
        itemsByType: {},
        itemsByTopic: {}
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

export class QdrantManager {
  private qdrantService: MainProcessQdrantService;
  private knowledgeService: MainProcessKnowledgeService;
  private isInitialized = false;
  private static ipcHandlersRegistered = false; // 静态标志确保IPC处理函数只注册一次

  constructor() {
    this.qdrantService = new MainProcessQdrantService();
    this.knowledgeService = new MainProcessKnowledgeService(this.qdrantService);

    // 只在第一次创建时注册IPC处理函数
    if (!QdrantManager.ipcHandlersRegistered) {
      this.setupIpcHandlers();
      QdrantManager.ipcHandlersRegistered = true;
    }
    // 移除自动初始化，由主应用控制初始化时机
  }

  /**
   * Initialize Qdrant service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.qdrantService.start();

      // Wait a moment for the service to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Initialize collections through knowledge service
      await this.knowledgeService['initializeCollections']?.();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Qdrant service:', error);
      throw error;
    }
  }

  /**
   * Shutdown Qdrant service
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Qdrant service...');
      await this.qdrantService.stop();
      this.isInitialized = false;
      console.log('Qdrant service shut down successfully');
    } catch (error) {
      console.error('Failed to shutdown Qdrant service:', error);
    }
  }

  /**
   * Cleanup all resources and remove IPC handlers
   */
  static cleanup(): void {
    try {
      console.log('🧹 Cleaning up Qdrant manager resources...');

      // 移除所有IPC处理函数
      const ipcHandlers = [
        'qdrant:start', 'qdrant:stop', 'qdrant:status',
        'knowledge:add', 'knowledge:search', 'knowledge:get',
        'knowledge:update', 'knowledge:delete',
        'knowledge:storeContext', 'knowledge:getContext',
        'knowledge:stats', 'knowledge:clear',
        'qdrant:collections', 'qdrant:createCollection', 'qdrant:deleteCollection'
      ];

      ipcHandlers.forEach(handler => {
        try {
          ipcMain.removeAllListeners(handler);
        } catch (error) {
          console.warn(`Failed to remove IPC handler ${handler}:`, error);
        }
      });

      // 重置静态标志
      QdrantManager.ipcHandlersRegistered = false;

      console.log('✅ Qdrant manager cleanup completed');
    } catch (error) {
      console.error('❌ Error during Qdrant manager cleanup:', error);
    }
  }

  /**
   * Check if Qdrant is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.qdrantService.isServiceReady();
  }

  /**
   * Setup IPC handlers for Qdrant operations
   */
  private setupIpcHandlers(): void {
    // Qdrant service control
    ipcMain.handle('qdrant:start', async () => {
      try {
        await this.initialize();
        return { success: true };
      } catch (error) {
        console.error('Failed to start Qdrant:', error);
        return { success: false, error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) };
      }
    });

    ipcMain.handle('qdrant:stop', async () => {
      try {
        await this.shutdown();
        return { success: true };
      } catch (error) {
        console.error('Failed to stop Qdrant:', error);
        return { success: false, error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) };
      }
    });

    ipcMain.handle('qdrant:status', async () => {
      try {
        const health = await this.qdrantService.getHealth();
        const metrics = await this.qdrantService.getMetrics();
        const collections = await this.qdrantService.listCollections();

        return {
          success: true,
          status: {
            ready: this.isReady(),
            health,
            metrics,
            collections: collections.map(col => ({
              name: col.name,
              points: col.points_count,
              vectors: col.vectors_count
            }))
          }
        };
      } catch (error) {
        console.error('Failed to get Qdrant status:', error);
        return { success: false, error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) };
      }
    });

    // Knowledge service operations
    ipcMain.handle('knowledge:add', async (_, { item, embedding, provider }) => {
      try {
        await this.knowledgeService.addKnowledgeItem(item, provider, embedding);
        return { success: true };
      } catch (error) {
        console.error('Failed to add knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:search', async (_, { query, provider, limit, filters }) => {
      try {
        const results = await this.knowledgeService.searchKnowledge(query, provider, limit, filters);
        return { success: true, results };
      } catch (error) {
        console.error('Failed to search knowledge:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:get', async (_, { id }) => {
      try {
        const item = await this.knowledgeService.getKnowledgeItem(id);
        return { success: true, item };
      } catch (error) {
        console.error('Failed to get knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:update', async (_, { id, updates, provider }) => {
      try {
        await this.knowledgeService.updateKnowledgeItem(id, updates, provider);
        return { success: true };
      } catch (error) {
        console.error('Failed to update knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:delete', async (_, { id }) => {
      try {
        await this.knowledgeService.deleteKnowledgeItem(id);
        return { success: true };
      } catch (error) {
        console.error('Failed to delete knowledge item:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:storeContext', async (_, { sessionId, messages, provider }) => {
      try {
        await this.knowledgeService.storeConversationContext(sessionId, messages, provider);
        return { success: true };
      } catch (error) {
        console.error('Failed to store conversation context:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:getContext', async (_, { sessionId, query, provider, limit }) => {
      try {
        const context = await this.knowledgeService.getRelevantContext(sessionId, query, provider, limit);
        return { success: true, context };
      } catch (error) {
        console.error('Failed to get relevant context:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:stats', async () => {
      try {
        const stats = await this.knowledgeService.getKnowledgeStats();
        return { success: true, stats };
      } catch (error) {
        console.error('Failed to get knowledge stats:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('knowledge:clear', async () => {
      try {
        await this.knowledgeService.clearAllKnowledge();
        return { success: true };
      } catch (error) {
        console.error('Failed to clear knowledge:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Collection management
    ipcMain.handle('qdrant:collections', async () => {
      try {
        const collections = await this.qdrantService.listCollections();
        return { success: true, collections };
      } catch (error) {
        console.error('Failed to list collections:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('qdrant:createCollection', async (_, { name, vectorSize, distance }) => {
      try {
        await this.qdrantService.createCollection(name, vectorSize, distance);
        return { success: true };
      } catch (error) {
        console.error('Failed to create collection:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('qdrant:deleteCollection', async (_, { name }) => {
      try {
        await this.qdrantService.deleteCollection(name);
        return { success: true };
      } catch (error) {
        console.error('Failed to delete collection:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }
}

// Singleton instance
let qdrantManager: QdrantManager | null = null;

export function getQdrantManager(): QdrantManager {
  if (!qdrantManager) {
    qdrantManager = new QdrantManager();
  }
  return qdrantManager;
}

export default QdrantManager;