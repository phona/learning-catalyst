# Main Thread Migration - Detailed Implementation Plan

## Executive Summary

**Objective**: Migrate LangChain and dependent services from renderer to main thread to resolve AsyncLocalStorage browser compatibility issues and enable agent tool database access.

**Approach**: Complete service layer migration with clean UI/business logic separation.

**Timeline**: 2-3 days (14-20 hours total)

## Detailed Implementation Roadmap

### Phase 1: Service Infrastructure Setup (Day 1 - 4-6 hours)

#### 1.1 Create Main Thread Service Architecture

**File Structure to Create:**
```
electron/main/services/
├── LangChainService.ts           # Central LangChain orchestration
├── SessionServiceMain.ts         # Database operations in main thread
├── ConfigServiceMain.ts          # Configuration management
├── ToolExecutorService.ts        # Secure tool execution
├── ConceptParsingServiceMain.ts  # AI-powered content analysis
└── AgentManagerMain.ts           # Agent lifecycle management

electron/main/handlers/
├── langchain-handlers.ts         # LangChain IPC endpoints
├── service-handlers.ts           # General service IPC
├── tool-execution-handlers.ts    # Tool execution IPC
└── database-handlers.ts          # Enhanced database IPC

electron/main/utils/
├── performance-monitor.ts        # Performance tracking
├── error-handler.ts              # Centralized error handling
└── service-container.ts          # Dependency injection
```

#### 1.2 Core Service Implementations

**LangChainService.ts (Main Thread):**
```typescript
import { AgentManagerMain } from './AgentManagerMain';
import { createDatabase } from '../../../src/modules/database';
import { Kysely } from 'kysely';
import type { Database } from '../../../src/modules/database/kysely-schema';

export class LangChainService {
  private agentManager: AgentManagerMain;
  private sessionService: SessionServiceMain;
  private configService: ConfigServiceMain;
  private toolExecutor: ToolExecutorService;
  private db: Kysely<Database>;
  private isInitialized = false;

  constructor() {
    this.setupErrorHandling();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing LangChain service in main thread...');

      // Initialize database connection
      this.db = await createDatabase();

      // Initialize services with dependency injection
      this.configService = new ConfigServiceMain();
      this.sessionService = new SessionServiceMain(this.db);
      this.toolExecutor = new ToolExecutorService(this.db, this.sessionService);
      this.agentManager = new AgentManagerMain(
        this.configService,
        this.sessionService,
        this.toolExecutor
      );

      await this.agentManager.initialize();
      this.isInitialized = true;

      console.log('✅ LangChain service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize LangChain service:', error);
      throw error;
    }
  }

  // Agent operations
  async createAgent(type: string, config: any): Promise<string> {
    this.ensureInitialized();
    return await this.agentManager.createAgent(type, config);
  }

  async sendMessage(agentId: string, message: string, options?: any): Promise<AsyncGenerator<string>> {
    this.ensureInitialized();
    return await this.agentManager.sendMessage(agentId, message, options);
  }

  async generateSessionTitle(content: string): Promise<string> {
    this.ensureInitialized();
    return await this.agentManager.generateSessionTitle(content);
  }

  // Tool operations
  async executeTool(toolName: string, agentId: string, parameters: any): Promise<any> {
    this.ensureInitialized();
    return await this.toolExecutor.executeTool(toolName, agentId, parameters);
  }

  // Concept parsing operations
  async parseConcepts(content: string, options?: any): Promise<any> {
    this.ensureInitialized();
    const parser = new ConceptParsingServiceMain(this.agentManager);
    return await parser.parseConcepts(content, options);
  }

  // Session operations
  async searchSessions(query: any): Promise<any> {
    this.ensureInitialized();
    return await this.sessionService.searchSessions(query);
  }

  async createSession(sessionData: any): Promise<string> {
    this.ensureInitialized();
    return await this.sessionService.createSession(sessionData);
  }

  async saveMessage(sessionId: string, message: any): Promise<void> {
    this.ensureInitialized();
    return await this.sessionService.saveMessage(sessionId, message);
  }

  // Configuration operations
  async getConfig(): Promise<any> {
    this.ensureInitialized();
    return await this.configService.getConfig();
  }

  async updateConfig(config: any): Promise<void> {
    this.ensureInitialized();
    return await this.configService.updateConfig(config);
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.agentManager) {
      await this.agentManager.cleanup();
    }
    if (this.db) {
      await this.db.destroy();
    }
    console.log('LangChain service cleaned up');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('LangChain service is not initialized');
    }
  }

  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception in LangChain service:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection in LangChain service:', reason);
    });
  }
}
```

**SessionServiceMain.ts (Main Thread):**
```typescript
import { Kysely, sql } from 'kysely';
import type { Database } from '../../../src/modules/database/kysely-schema';
import type { Session, SessionSearchQuery, SessionSearchResult } from '../../../src/types/session';

export class SessionServiceMain {
  constructor(private db: Kysely<Database>) {}

  async searchSessions(query: SessionSearchQuery): Promise<SessionSearchResult> {
    try {
      console.log('[SessionServiceMain] Searching sessions with query:', query);

      let baseQuery = this.db
        .selectFrom('learning_sessions as s')
        .leftJoin('messages as m', 's.id', 'm.session_id')
        .select([
          's.id',
          's.title',
          's.description',
          's.start_time',
          's.duration_seconds',
          's.total_messages',
          's.concepts_studied',
          's.difficulty_level',
          's.session_type',
          's.metadata',
          's.created_at',
          's.updated_at',
          (eb) => eb.fn.count('m.id').as('message_count')
        ])
        .groupBy('s.id');

      // Apply filters
      if (query.query) {
        const searchTerm = `%${query.query}%`;
        baseQuery = baseQuery.where((eb) => eb.or([
          eb('s.title', 'like', searchTerm),
          eb('s.description', 'like', searchTerm)
        ]));
      }

      if (query.date_range) {
        baseQuery = baseQuery
          .where('s.start_time', '>=', query.date_range.start.toISOString())
          .where('s.start_time', '<=', query.date_range.end.toISOString());
      }

      // Ordering and pagination
      baseQuery = baseQuery.orderBy('s.updated_at', 'desc');

      if (query.limit) {
        baseQuery = baseQuery.limit(query.limit);
      }

      if (query.offset) {
        baseQuery = baseQuery.offset(query.offset);
      }

      const rows = await baseQuery.execute();

      // Get total count
      const countResult = await this.db
        .selectFrom('learning_sessions as s')
        .select((eb) => eb.fn.count('s.id').as('total'))
        .execute();

      const total = Number(countResult[0]?.total) || 0;

      // Convert to session objects
      const sessions: Session[] = rows.map(row => ({
        id: row.id,
        title: row.title,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
        messages: [], // Empty for search results
        metadata: {
          title: row.title,
          description: row.description,
          tags: [],
          category: 'general',
          difficulty: 'intermediate',
          learning_objectives: [],
          topics_covered: [],
          user_id: undefined,
          archived: false,
          pinned: false,
        },
        context: {
          system_prompt: undefined,
          notes: undefined,
          learning_objectives: [],
        },
        checkpoints: [],
        statistics: {
          total_messages: Number(row.message_count) || 0,
          user_messages: 0,
          assistant_messages: 0,
          total_tokens_used: 0,
          total_thinking_tokens: 0,
          session_duration: row.duration_seconds || 0,
          average_response_time: 0,
          concepts_learned: 0,
          checkpoints_created: 0,
          productivity_score: 0,
          engagement_score: 0,
        },
      }));

      return {
        sessions,
        total,
        has_more: (query.offset || 0) + sessions.length < total,
      };
    } catch (error) {
      console.error('[SessionServiceMain] Failed to search sessions:', error);
      throw new Error(`Failed to search sessions: ${error}`);
    }
  }

  async createSession(sessionData: any): Promise<string> {
    try {
      const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const now = new Date().toISOString();

      await this.db
        .insertInto('learning_sessions')
        .values({
          id,
          title: sessionData.title,
          description: sessionData.metadata?.description,
          start_time: now,
          duration_seconds: 0,
          total_messages: 0,
          concepts_studied: 0,
          difficulty_level: 1,
          session_type: 'general',
          metadata: JSON.stringify(sessionData.metadata || {}),
          created_at: now,
          updated_at: now,
        })
        .execute();

      return id;
    } catch (error) {
      console.error('[SessionServiceMain] Failed to create session:', error);
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  async saveMessage(sessionId: string, message: any): Promise<void> {
    try {
      // Check if session exists
      const existingSession = await this.db
        .selectFrom('learning_sessions')
        .select('id')
        .where('id', '=', sessionId)
        .executeTakeFirst();

      if (!existingSession) {
        await this.createSession({
          id: sessionId,
          title: 'Auto-created Session',
          metadata: {
            description: message.content?.substring(0, 100) + '...',
            auto_created: true
          }
        });
      }

      // Get message order
      const lastMessage = await this.db
        .selectFrom('messages')
        .select('message_order')
        .where('session_id', '=', sessionId)
        .orderBy('message_order', 'desc')
        .limit(1)
        .executeTakeFirst();

      const message_order = (lastMessage?.message_order || 0) + 1;

      // Insert message
      await this.db
        .insertInto('messages')
        .values({
          id: message.id,
          session_id: sessionId,
          role: message.role,
          content: message.content,
          thinking_content: message.thinking_content,
          provider: message.provider,
          model: message.model,
          tokens_used: message.tokens_used ? JSON.stringify({
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: message.tokens_used
          }) : '{}',
          timestamp: message.timestamp.toISOString(),
          message_order,
          created_at: new Date().toISOString()
        })
        .execute();

      // Update session message count
      await this.db
        .updateTable('learning_sessions')
        .set({
          total_messages: sql`total_messages + 1`,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', sessionId)
        .execute();

    } catch (error) {
      console.error('[SessionServiceMain] Failed to save message:', error);
      throw new Error(`Failed to save message: ${error}`);
    }
  }

  async getSessionById(id: string): Promise<Session | null> {
    try {
      const sessionRow = await this.db
        .selectFrom('learning_sessions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!sessionRow) {
        return null;
      }

      const messageRows = await this.db
        .selectFrom('messages')
        .selectAll()
        .where('session_id', '=', id)
        .orderBy('message_order', 'asc')
        .execute();

      return this.convertRowToSessionWithMessages(sessionRow, messageRows);
    } catch (error) {
      console.error('[SessionServiceMain] Failed to get session by ID:', error);
      throw new Error(`Failed to get session: ${error}`);
    }
  }

  private convertRowToSessionWithMessages(sessionRow: any, messageRows: any[]): Session {
    const metadata = JSON.parse(sessionRow.metadata || '{}');

    return {
      id: sessionRow.id,
      title: sessionRow.title,
      created_at: new Date(sessionRow.created_at),
      updated_at: new Date(sessionRow.updated_at),
      messages: messageRows.map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        thinking_content: row.thinking_content,
        timestamp: new Date(row.timestamp),
        provider: row.provider,
        model: row.model,
        tokens_used: JSON.parse(row.tokens_used || '{}')?.total || 0,
      })),
      metadata: {
        title: sessionRow.title,
        description: sessionRow.description,
        tags: metadata.tags || [],
        category: metadata.category || 'general',
        difficulty: metadata.difficulty || 'intermediate',
        learning_objectives: metadata.learning_objectives || [],
        topics_covered: metadata.topics_covered || [],
        user_id: metadata.user_id,
        archived: metadata.archived || false,
        pinned: metadata.pinned || false,
        color: metadata.color,
      },
      context: {
        system_prompt: metadata.system_prompt,
        notes: metadata.notes,
        learning_objectives: metadata.learning_objectives || [],
      },
      checkpoints: metadata.checkpoints || [],
      statistics: {
        total_messages: sessionRow.total_messages,
        user_messages: messageRows.filter(m => m.role === 'user').length,
        assistant_messages: messageRows.filter(m => m.role === 'assistant').length,
        total_tokens_used: messageRows.reduce((sum, m) => {
          const tokens = JSON.parse(m.tokens_used || '{}');
          return sum + (tokens.total || 0);
        }, 0),
        total_thinking_tokens: 0,
        session_duration: sessionRow.duration_seconds || 0,
        average_response_time: 0,
        concepts_learned: sessionRow.concepts_studied || 0,
        checkpoints_created: (metadata.checkpoints || []).length,
        productivity_score: 0,
        engagement_score: 0,
      },
    };
  }
}
```

#### 1.3 IPC Handler Implementation

**langchain-handlers.ts:**
```typescript
import { ipcMain, MessageChannelMain } from 'electron';
import { LangChainService } from '../services/LangChainService';

let langChainService: LangChainService;

export function setupLangChainHandlers(): void {
  console.log('🔧 Setting up LangChain IPC handlers...');

  langChainService = new LangChainService();

  // Service initialization
  ipcMain.handle('langchain:initialize', async () => {
    try {
      await langChainService.initialize();
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize LangChain service:', error);
      return { success: false, error: error.message };
    }
  });

  // Agent management
  ipcMain.handle('langchain:create-agent', async (_, type, config) => {
    try {
      const agentId = await langChainService.createAgent(type, config);
      return { success: true, agentId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Streaming message handler
  ipcMain.handle('langchain:send-message', async (event, agentId, message, options) => {
    try {
      const { port1, port2 } = new MessageChannelMain();
      event.senderFrame.postMessage('langchain:message-stream-start', [], [port2]);

      const stream = await langChainService.sendMessage(agentId, message, options);

      for await (const chunk of stream) {
        port1.postMessage({
          type: 'chunk',
          data: chunk,
          timestamp: Date.now()
        });
      }

      port1.postMessage({
        type: 'end',
        timestamp: Date.now()
      });

      port1.close();
      return { success: true };
    } catch (error) {
      console.error('Error in streaming message:', error);
      event.sender.send('langchain:message-stream-error', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  });

  // Non-streaming message handler
  ipcMain.handle('langchain:send-message-sync', async (_, agentId, message, options) => {
    try {
      const stream = await langChainService.sendMessage(agentId, message, options);
      let fullResponse = '';

      for await (const chunk of stream) {
        fullResponse += chunk;
      }

      return { success: true, response: fullResponse };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Title generation
  ipcMain.handle('langchain:generate-title', async (_, content) => {
    try {
      const title = await langChainService.generateSessionTitle(content);
      return { success: true, title };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Tool execution
  ipcMain.handle('langchain:execute-tool', async (_, toolName, agentId, parameters) => {
    try {
      const result = await langChainService.executeTool(toolName, agentId, parameters);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Concept parsing
  ipcMain.handle('langchain:parse-concepts', async (_, content, options) => {
    try {
      const result = await langChainService.parseConcepts(content, options);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Session operations
  ipcMain.handle('langchain:search-sessions', async (_, query) => {
    try {
      const result = await langChainService.searchSessions(query);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('langchain:create-session', async (_, sessionData) => {
    try {
      const sessionId = await langChainService.createSession(sessionData);
      return { success: true, sessionId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('langchain:save-message', async (_, sessionId, message) => {
    try {
      await langChainService.saveMessage(sessionId, message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('langchain:get-session', async (_, sessionId) => {
    try {
      const session = await langChainService.sessionService.getSessionById(sessionId);
      return { success: true, session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Configuration operations
  ipcMain.handle('langchain:get-config', async () => {
    try {
      const config = await langChainService.getConfig();
      return { success: true, config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('langchain:update-config', async (_, config) => {
    try {
      await langChainService.updateConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Cleanup
  ipcMain.handle('langchain:cleanup', async () => {
    try {
      await langChainService.cleanup();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('✅ LangChain IPC handlers setup complete');
}
```

#### 1.4 Enhanced Preload API

**langchain-api.ts:**
```typescript
import { contextBridge, ipcRenderer } from 'electron';

export interface LangChainAPI {
  // Service management
  initialize(): Promise<{ success: boolean; error?: string }>;
  cleanup(): Promise<{ success: boolean; error?: string }>;

  // Agent operations
  createAgent(type: string, config?: any): Promise<{ success: boolean; agentId?: string; error?: string }>;
  sendMessage(agentId: string, message: string, options?: any): Promise<{ success: boolean; response?: string; error?: string }>;
  sendMessageStream(agentId: string, message: string, options?: any): Promise<{
    onChunk: (callback: (chunk: string) => void) => void;
    onEnd: (callback: () => void) => void;
    onError: (callback: (error: string) => void) => void;
  }>;
  generateTitle(content: string): Promise<{ success: boolean; title?: string; error?: string }>;

  // Tool operations
  executeTool(toolName: string, agentId: string, parameters: any): Promise<{ success: boolean; result?: any; error?: string }>;

  // Concept parsing
  parseConcepts(content: string, options?: any): Promise<{ success: boolean; result?: any; error?: string }>;

  // Session operations
  searchSessions(query: any): Promise<{ success: boolean; result?: any; error?: string }>;
  createSession(sessionData: any): Promise<{ success: boolean; sessionId?: string; error?: string }>;
  saveMessage(sessionId: string, message: any): Promise<{ success: boolean; error?: string }>;
  getSession(sessionId: string): Promise<{ success: boolean; session?: any; error?: string }>;

  // Configuration operations
  getConfig(): Promise<{ success: boolean; config?: any; error?: string }>;
  updateConfig(config: any): Promise<{ success: boolean; error?: string }>;
}

const langChainAPI: LangChainAPI = {
  // Service management
  initialize: () => ipcRenderer.invoke('langchain:initialize'),
  cleanup: () => ipcRenderer.invoke('langchain:cleanup'),

  // Agent operations
  createAgent: (type: string, config?: any) =>
    ipcRenderer.invoke('langchain:create-agent', type, config),

  sendMessage: (agentId: string, message: string, options?: any) =>
    ipcRenderer.invoke('langchain:send-message-sync', agentId, message, options),

  sendMessageStream: (agentId: string, message: string, options?: any) => {
    return new Promise((resolve) => {
      const streamHandlers = {
        onChunk: null as ((chunk: string) => void) | null,
        onEnd: null as (() => void) | null,
        onError: null as ((error: string) => void) | null,
      };

      // Start the streaming process
      ipcRenderer.invoke('langchain:send-message', agentId, message, options)
        .then((result) => {
          if (!result.success) {
            streamHandlers.onError?.(result.error);
            return;
          }
        });

      // Listen for stream start
      ipcRenderer.once('langchain:message-stream-start', (event) => {
        const port = event.ports[0];

        port.onmessage = (event) => {
          const { type, data, error } = event.data;

          switch (type) {
            case 'chunk':
              streamHandlers.onChunk?.(data);
              break;
            case 'end':
              streamHandlers.onEnd?.();
              port.close();
              break;
            case 'error':
              streamHandlers.onError?.(error);
              port.close();
              break;
          }
        };

        port.onmessageerror = (event) => {
          streamHandlers.onError?.('Stream communication error');
          port.close();
        };
      });

      // Listen for stream errors
      ipcRenderer.once('langchain:message-stream-error', (event, { error }) => {
        streamHandlers.onError?.(error);
      });

      resolve({
        onChunk: (callback) => { streamHandlers.onChunk = callback; },
        onEnd: (callback) => { streamHandlers.onEnd = callback; },
        onError: (callback) => { streamHandlers.onError = callback; },
      });
    });
  },

  generateTitle: (content: string) =>
    ipcRenderer.invoke('langchain:generate-title', content),

  // Tool operations
  executeTool: (toolName: string, agentId: string, parameters: any) =>
    ipcRenderer.invoke('langchain:execute-tool', toolName, agentId, parameters),

  // Concept parsing
  parseConcepts: (content: string, options?: any) =>
    ipcRenderer.invoke('langchain:parse-concepts', content, options),

  // Session operations
  searchSessions: (query: any) =>
    ipcRenderer.invoke('langchain:search-sessions', query),

  createSession: (sessionData: any) =>
    ipcRenderer.invoke('langchain:create-session', sessionData),

  saveMessage: (sessionId: string, message: any) =>
    ipcRenderer.invoke('langchain:save-message', sessionId, message),

  getSession: (sessionId: string) =>
    ipcRenderer.invoke('langchain:get-session', sessionId),

  // Configuration operations
  getConfig: () => ipcRenderer.invoke('langchain:get-config'),
  updateConfig: (config: any) => ipcRenderer.invoke('langchain:update-config', config),
};

// Expose the API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  langchain: langChainAPI,
  // Preserve existing APIs
  // ... other existing APIs
});
```

### Phase 2: Agent & Tool Migration (Day 2 - 6-8 hours)

#### 2.1 Main Thread Agent Manager

**AgentManagerMain.ts:**
```typescript
import { createAgent, ReactAgent } from "langchain";
import { tool } from "langchain";
import { z } from "zod";
import type { ConfigServiceMain } from './ConfigServiceMain';
import type { SessionServiceMain } from './SessionServiceMain';
import type { ToolExecutorService } from './ToolExecutorService';
import { createLearningTools } from './tools/learning-tools';

export enum AgentType {
  LEARNING = 'learning',
  ASSESSMENT = 'assessment',
  TUTORING = 'tutoring',
  PRACTICE = 'practice',
  RESEARCH = 'research',
  COLLABORATION = 'collaboration',
  TITLE_GENERATION = 'title-generation'
}

export class AgentManagerMain {
  private agents: Map<string, ReactAgent> = new Map();
  private isInitialized = false;

  constructor(
    private configService: ConfigServiceMain,
    private sessionService: SessionServiceMain,
    private toolExecutor: ToolExecutorService
  ) {}

  async initialize(): Promise<void> {
    try {
      console.log('🤖 Initializing AgentManager in main thread...');

      // Test LangChain functionality
      console.log('✅ LangChain imported successfully');

      this.isInitialized = true;
      console.log('✅ AgentManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AgentManager:', error);
      throw error;
    }
  }

  async createAgent(type: AgentType, config?: any): Promise<string> {
    this.ensureInitialized();

    const agentId = `agent_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const agent = await this.buildAgent(type, config);
      this.agents.set(agentId, agent);

      console.log(`✅ Created agent ${agentId} of type ${type}`);
      return agentId;
    } catch (error) {
      console.error(`❌ Failed to create agent ${type}:`, error);
      throw error;
    }
  }

  private async buildAgent(type: AgentType, config?: any): Promise<ReactAgent> {
    const systemPrompts = {
      learning: `You are a Learning Catalyst focused on deep concept understanding.

Your expertise includes:
- Breaking down complex topics into understandable parts
- Creating clear explanations and analogies
- Identifying key concepts and relationships
- Connecting new information to prior knowledge
- Adapting explanations to different learning styles

Your tools help analyze concepts, find explanations, and connect ideas.
Always ensure explanations are accurate, clear, and build understanding progressively.`,

      assessment: `You are an Assessment Specialist focused on evaluating learning outcomes.

Your expertise includes:
- Creating appropriate quizzes and tests
- Evaluating student responses accurately
- Providing constructive feedback
- Tracking progress over time
- Identifying knowledge gaps and strengths

Create assessments that are fair, comprehensive, and aligned with learning objectives.
Provide feedback that is specific, actionable, and encouraging.`,

      tutoring: `You are a Personal Tutor focused on individualized learning support.

Your expertise includes:
- Providing step-by-step guidance
- Asking probing questions to stimulate thinking
- Adapting explanations to student needs
- Checking for understanding
- Offering appropriate hints without giving away answers

Be patient, encouraging, and adaptive to each learner's pace and style.
Use Socratic questioning to help learners discover answers themselves.`,

      practice: `You are a Practice Facilitator focused on hands-on learning.

Your expertise includes:
- Generating relevant practice activities
- Creating exercises of appropriate difficulty
- Providing step-by-step solution guidance
- Checking work and giving feedback
- Suggesting variations for additional practice

Design activities that reinforce learning objectives and build confidence.
Provide feedback that helps learners improve their understanding and skills.`,

      research: `You are a Research Assistant focused on information gathering and analysis.

Your expertise includes:
- Finding reliable information sources
- Analyzing and synthesizing information
- Evaluating source credibility
- Citing references properly
- Presenting findings clearly

Help users gather accurate information, understand different perspectives, and draw evidence-based conclusions.
Always verify information and cite sources appropriately.`,

      collaboration: `You are a Collaboration Facilitator focused on group learning activities.

Your expertise includes:
- Facilitating productive discussions
- Coordinating team efforts
- Ensuring equal participation
- Resolving conflicts constructively
- Integrating different perspectives

Promote effective communication, respect diverse viewpoints, and help groups achieve their learning goals together.`,

      'title-generation': `You are a Title Generation Specialist focused on creating concise, descriptive session titles.

Your expertise includes:
- Analyzing conversation content to identify main topics
- Creating clear, engaging titles in 3-8 words
- Capturing the essence of learning discussions
- Using appropriate educational terminology
- Distinguishing between different subjects and skill levels

Generate titles that are:
- Specific and descriptive
- Easy to understand at a glance
- Appropriate for the content level
- No more than 8 words maximum
- In title case (First Letter Of Each Word Capitalized)

Respond with ONLY the title, no additional text or explanation.`
    };

    const systemPrompt = systemPrompts[type] || systemPrompts.learning;

    // Create tools for the agent
    const tools = await this.createToolsForAgentType(type, config);

    // Get current model configuration
    const appConfig = await this.configService.getConfig();
    const modelConfig = {
      provider: config?.provider || appConfig.ai.model_types.chat.default_provider,
      model: config?.model || appConfig.ai.model_types.chat.default_model,
      temperature: config?.temperature || appConfig.ai.model_types.chat.settings.temperature,
      maxTokens: config?.maxTokens || appConfig.ai.model_types.chat.settings.max_tokens
    };

    // Create the agent using LangChain
    const agent = createAgent({
      model: `${modelConfig.provider}:${modelConfig.model}`,
      tools,
      systemPrompt,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens
    });

    return agent;
  }

  private async createToolsForAgentType(type: AgentType, config?: any): Promise<any[]> {
    switch (type) {
      case 'learning':
        return await createLearningTools(this.toolExecutor, this.configService, this.sessionService);
      case 'assessment':
        return await createAssessmentTools(this.toolExecutor, this.sessionService);
      case 'tutoring':
        return await createTutoringTools(this.toolExecutor, this.sessionService);
      case 'practice':
        return await createPracticeTools(this.toolExecutor, this.sessionService);
      case 'research':
        return await createResearchTools(this.toolExecutor, this.sessionService);
      case 'collaboration':
        return await createCollaborationTools(this.toolExecutor, this.sessionService);
      case 'title-generation':
        return []; // No tools needed for title generation
      default:
        return [];
    }
  }

  async sendMessage(agentId: string, message: string, options?: any): Promise<AsyncGenerator<string>> {
    this.ensureInitialized();

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const agentInput = {
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    };

    try {
      // Stream the response
      const stream = await agent.stream(agentInput);

      return this.createStreamFromAgentResponse(stream);
    } catch (error) {
      console.error(`Error in agent ${agentId}:`, error);
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }

  private async* createStreamFromAgentResponse(stream: any): AsyncGenerator<string> {
    try {
      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content;
        }
      }
    } catch (error) {
      console.error('Error in agent response stream:', error);
      throw error;
    }
  }

  async generateSessionTitle(content: string): Promise<string> {
    this.ensureInitialized();

    try {
      const agent = await this.createAgent('title-generation');
      const agentInput = {
        messages: [
          {
            role: 'user',
            content: `Generate a concise, descriptive title for this learning session content:\n\n${content}`
          }
        ]
      };

      const result = await agent.invoke(agentInput);
      let title = result.content?.trim() || 'Untitled Session';

      // Clean up the result
      title = title.replace(/^["']|["']$/g, '');
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }

      return title || 'Untitled Session';
    } catch (error) {
      console.error('Failed to generate session title:', error);
      return 'Untitled Session';
    }
  }

  async getProviderInfo(): Promise<{ type: string; model: string } | null> {
    try {
      const config = await this.configService.getConfig();
      return {
        type: config.ai.model_types.chat.default_provider,
        model: config.ai.model_types.chat.default_model
      };
    } catch (error) {
      console.error('Failed to get provider info:', error);
      return null;
    }
  }

  getAvailableAgentTypes(): AgentType[] {
    return Object.values(AgentType);
  }

  getAgentTypeInfo(agentType: AgentType): { name: string; description: string } {
    const info = {
      [AgentType.LEARNING]: {
        name: 'Learning Assistant',
        description: 'Concept understanding, explanations, and knowledge building'
      },
      [AgentType.ASSESSMENT]: {
        name: 'Assessment Assistant',
        description: 'Quizzes, evaluations, and progress tracking'
      },
      [AgentType.TUTORING]: {
        name: 'Tutoring Assistant',
        description: 'Personalized guidance and step-by-step support'
      },
      [AgentType.PRACTICE]: {
        name: 'Practice Assistant',
        description: 'Exercises, coding challenges, and hands-on activities'
      },
      [AgentType.RESEARCH]: {
        name: 'Research Assistant',
        description: 'Information gathering and analysis'
      },
      [AgentType.COLLABORATION]: {
        name: 'Collaboration Assistant',
        description: 'Group work facilitation and peer interaction'
      },
      [AgentType.TITLE_GENERATION]: {
        name: 'Title Generation Assistant',
        description: 'Generate concise, descriptive session titles'
      }
    };

    return info[agentType] || { name: 'Unknown', description: 'Unknown agent type' };
  }

  async cleanup(): Promise<void> {
    this.agents.clear();
    console.log('AgentManager cleaned up');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AgentManager is not initialized');
    }
  }
}
```

#### 2.2 Main Thread Tool Implementation

**tools/learning-tools.ts:**
```typescript
import { tool } from "langchain";
import { z } from "zod";
import type { ToolExecutorService } from '../ToolExecutorService';
import type { ConfigServiceMain } from '../ConfigServiceMain';
import type { SessionServiceMain } from '../SessionServiceMain';

export async function createLearningTools(
  toolExecutor: ToolExecutorService,
  configService: ConfigServiceMain,
  sessionService: SessionServiceMain
) {
  // Tool for parsing and analyzing concepts from content
  const parseConcepts = tool(
    async ({ content, session_id }: { content: string; session_id?: string }) => {
      try {
        if (!session_id) {
          return {
            success: false,
            error: "Session ID is required for concept parsing",
            concepts: [],
          };
        }

        // Use the concept parsing service
        const result = await toolExecutor.executeConceptParsing(content, {
          sessionId: session_id,
          extractRelationships: true,
          identifyKeyTopics: true,
          generateSummary: true,
        });

        return {
          success: true,
          concepts: result.concepts.map(concept => ({
            name: concept.name,
            definition: concept.definition,
            category: concept.category,
            difficulty: concept.difficulty,
            relationships: concept.relationships || [],
            examples: concept.examples || [],
          })),
          summary: result.summary,
          keyTopics: result.keyTopics || [],
          relationships: result.relationships || [],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to parse concepts",
          concepts: [],
        };
      }
    },
    {
      name: "parse_concepts",
      description: "Parse and analyze educational concepts from text content. Extracts definitions, relationships, and key topics.",
      schema: z.object({
        content: z.string().describe("The text content to analyze for concepts"),
        session_id: z.string().optional().describe("Optional session ID to associate the concepts with"),
      }),
    }
  );

  // Tool for searching learning sessions
  const searchSessions = tool(
    async ({ query, tags, limit }: { query?: string; tags?: string[]; limit?: number }) => {
      try {
        const searchQuery = {
          query,
          tags,
          limit: limit || 10,
        };

        const result = await sessionService.searchSessions(searchQuery);

        return {
          success: true,
          sessions: result.sessions.map(session => ({
            id: session.id,
            title: session.title,
            description: session.metadata.description,
            tags: session.metadata.tags,
            category: session.metadata.category,
            difficulty: session.metadata.difficulty,
            topics_covered: session.metadata.topics_covered,
            created_at: session.created_at,
            message_count: session.statistics.total_messages,
          })),
          total: result.total,
          has_more: result.has_more,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to search sessions",
          sessions: [],
        };
      }
    },
    {
      name: "search_sessions",
      description: "Search for learning sessions by query, tags, or other criteria. Useful for finding relevant past learning content.",
      schema: z.object({
        query: z.string().optional().describe("Search query to find relevant sessions"),
        tags: z.array(z.string()).optional().describe("Tags to filter sessions by"),
        limit: z.number().optional().describe("Maximum number of results to return (default: 10)"),
      }),
    }
  );

  // Tool for creating practice exercises
  const createExercise = tool(
    async ({
      session_id,
      topic,
      difficulty,
      exercise_type,
      question
    }: {
      session_id: string;
      topic: string;
      difficulty: 'easy' | 'medium' | 'hard';
      exercise_type: 'quiz' | 'coding' | 'discussion' | 'reflection';
      question: string;
    }) => {
      try {
        // Store exercise in database
        const exerciseData = {
          id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          session_id,
          topic,
          difficulty,
          exercise_type,
          question,
          created_at: new Date(),
        };

        // Save to database via tool executor
        await toolExecutor.saveExercise(exerciseData);

        return {
          success: true,
          exercise: exerciseData,
          message: `Created ${difficulty} ${exercise_type} exercise for topic: ${topic}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create exercise",
        };
      }
    },
    {
      name: "create_exercise",
      description: "Create a practice exercise for learning reinforcement. Supports quiz, coding, discussion, and reflection types.",
      schema: z.object({
        session_id: z.string().describe("The session ID to associate the exercise with"),
        topic: z.string().describe("The topic the exercise should cover"),
        difficulty: z.enum(['easy', 'medium', 'hard']).describe("Difficulty level of the exercise"),
        exercise_type: z.enum(['quiz', 'coding', 'discussion', 'reflection']).describe("Type of exercise to create"),
        question: z.string().describe("The exercise question or prompt"),
      }),
    }
  );

  // Tool for getting learning configuration
  const getLearningConfig = tool(
    async () => {
      try {
        const config = await configService.getConfig();

        return {
          success: true,
          config: {
            default_provider: config.ai.model_types.chat.default_provider,
            temperature: config.ai.model_types.chat.settings.temperature,
            max_tokens: config.ai.model_types.chat.settings.max_tokens,
            thinking_enabled: config.ai.model_types.chat.capabilities.thinking,
            auto_parsing: config.ai.content_discovery?.auto_parse_concepts || false,
            workspace_path: config.file_explorer?.default_workspace_path,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get learning configuration",
        };
      }
    },
    {
      name: "get_learning_config",
      description: "Get the current learning configuration and settings. Useful for understanding the current learning environment setup.",
      schema: z.object({}),
    }
  );

  // Tool for generating learning paths
  const generateLearningPath = tool(
    async ({
      topic,
      current_level,
      goals,
      session_count
    }: {
      topic: string;
      current_level: 'beginner' | 'intermediate' | 'advanced';
      goals: string[];
      session_count?: number;
    }) => {
      try {
        const sessions = session_count || 5;

        // Generate a structured learning path
        const learningPath = {
          topic,
          current_level,
          target_level: current_level === 'beginner' ? 'intermediate' :
                        current_level === 'intermediate' ? 'advanced' : 'expert',
          goals,
          sessions: Array.from({ length: sessions }, (_, i) => ({
            session_number: i + 1,
            title: `${topic} - Session ${i + 1}`,
            focus_areas: generateFocusAreas(topic, current_level, i + 1, sessions),
            difficulty: calculateSessionDifficulty(current_level, i + 1, sessions),
            estimated_duration: Math.floor(Math.random() * 30) + 30, // 30-60 minutes
            prerequisites: i > 0 ? [`${topic} - Session ${i}`] : [],
          })),
          total_estimated_duration: sessions * 45, // Average 45 minutes per session
          completion_criteria: [
            `Complete all ${sessions} learning sessions`,
            `Score 80% or higher on practice exercises`,
            `Apply concepts in real-world scenarios`,
          ],
        };

        // Store learning path in database
        await toolExecutor.saveLearningPath(learningPath);

        return {
          success: true,
          learning_path: learningPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate learning path",
        };
      }
    },
    {
      name: "generate_learning_path",
      description: "Generate a structured learning path for a given topic with progressive sessions and goals.",
      schema: z.object({
        topic: z.string().describe("The main topic to create a learning path for"),
        current_level: z.enum(['beginner', 'intermediate', 'advanced']).describe("User's current knowledge level"),
        goals: z.array(z.string()).describe("Learning goals the user wants to achieve"),
        session_count: z.number().optional().describe("Number of sessions to include in the learning path (default: 5)"),
      }),
    }
  );

  return {
    parseConcepts,
    searchSessions,
    createExercise,
    getLearningConfig,
    generateLearningPath,
  };
}

// Helper functions
function generateFocusAreas(topic: string, level: string, sessionNum: number, totalSessions: number): string[] {
  const progress = sessionNum / totalSessions;

  if (level === 'beginner') {
    if (progress < 0.3) {
      return [`${topic} fundamentals`, `Basic terminology`, `Core concepts`];
    } else if (progress < 0.7) {
      return [`${topic} applications`, `Practical examples`, `Common patterns`];
    } else {
      return [`${topic} best practices`, `Advanced basics`, `Next steps`];
    }
  } else if (level === 'intermediate') {
    if (progress < 0.3) {
      return [`${topic} advanced concepts`, `Complex scenarios`];
    } else if (progress < 0.7) {
      return [`${topic} optimization`, `Performance tuning`];
    } else {
      return [`${topic} mastery`, `Expert techniques`];
    }
  } else {
    return [`${topic} expert topics`, `Cutting-edge developments`, `Industry applications`];
  }
}

function calculateSessionDifficulty(currentLevel: string, sessionNum: number, totalSessions: number): string {
  const progress = sessionNum / totalSessions;

  if (currentLevel === 'beginner') {
    return progress < 0.6 ? 'beginner' : 'intermediate';
  } else if (currentLevel === 'intermediate') {
    return progress < 0.4 ? 'intermediate' : progress < 0.8 ? 'intermediate' : 'advanced';
  } else {
    return 'advanced';
  }
}
```

### Phase 3: Renderer Cleanup & Testing (Day 3 - 4-6 hours)

#### 3.1 Update Renderer Services to IPC Proxies

**src/services/AgentManager.ts (Updated Renderer Version):**
```typescript
import type { ProviderType } from '@/types/config';
import type { Session } from '@/types/session';

export enum AgentType {
  LEARNING = 'learning',
  ASSESSMENT = 'assessment',
  TUTORING = 'tutoring',
  PRACTICE = 'practice',
  RESEARCH = 'research',
  COLLABORATION = 'collaboration',
  TITLE_GENERATION = 'title-generation'
}

/**
 * IPC Proxy for AgentManager - communicates with main thread
 */
export class AgentManager {
  private agentCache: Map<AgentType, string> = new Map();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const result = await window.electronAPI.langchain.initialize();
      if (!result.success) {
        throw new Error(`Failed to initialize LangChain service: ${result.error}`);
      }
      this.isInitialized = true;
      console.log('✅ AgentManager IPC proxy initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AgentManager:', error);
      throw error;
    }
  }

  async getAgent(agentType: AgentType): Promise<string> {
    this.ensureInitialized();

    if (this.agentCache.has(agentType)) {
      return this.agentCache.get(agentType)!;
    }

    try {
      const result = await window.electronAPI.langchain.createAgent(agentType);

      if (!result.success) {
        throw new Error(`Failed to create agent: ${result.error}`);
      }

      this.agentCache.set(agentType, result.agentId!);
      console.log(`✅ Created ${agentType} agent via IPC`);
      return result.agentId!;
    } catch (error) {
      console.error(`❌ Failed to create ${agentType} agent:`, error);
      throw error;
    }
  }

  async sendMessageStream(
    agentId: string,
    message: string,
    options?: any
  ): Promise<AsyncGenerator<string>> {
    this.ensureInitialized();

    const stream = await window.electronAPI.langchain.sendMessageStream(agentId, message, options);
    return this.createAsyncGeneratorFromStream(stream);
  }

  async sendMessage(agentId: string, message: string, options?: any): Promise<string> {
    this.ensureInitialized();

    const result = await window.electronAPI.langchain.sendMessage(agentId, message, options);

    if (!result.success) {
      throw new Error(`Failed to send message: ${result.error}`);
    }

    return result.response!;
  }

  async generateSessionTitle(content: string): Promise<string> {
    this.ensureInitialized();

    const result = await window.electronAPI.langchain.generateTitle(content);

    if (!result.success) {
      throw new Error(`Failed to generate title: ${result.error}`);
    }

    return result.title || 'Untitled Session';
  }

  private async* createAsyncGeneratorFromStream(stream: any): AsyncGenerator<string> {
    let isComplete = false;
    let error: Error | null = null;
    const chunks: string[] = [];

    stream.onChunk((chunk: any) => {
      chunks.push(chunk);
    });

    stream.onEnd(() => {
      isComplete = true;
    });

    stream.onError((errorMessage: string) => {
      error = new Error(errorMessage);
      isComplete = true;
    });

    while (!isComplete) {
      if (error) throw error;

      if (chunks.length > 0) {
        yield chunks.shift()!;
      } else {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (error) throw error;

    while (chunks.length > 0) {
      yield chunks.shift()!;
    }
  }

  getAvailableAgentTypes(): AgentType[] {
    return Object.values(AgentType);
  }

  getAgentTypeInfo(agentType: AgentType): { name: string; description: string } {
    const info = {
      [AgentType.LEARNING]: {
        name: 'Learning Assistant',
        description: 'Concept understanding, explanations, and knowledge building'
      },
      [AgentType.ASSESSMENT]: {
        name: 'Assessment Assistant',
        description: 'Quizzes, evaluations, and progress tracking'
      },
      [AgentType.TUTORING]: {
        name: 'Tutoring Assistant',
        description: 'Personalized guidance and step-by-step support'
      },
      [AgentType.PRACTICE]: {
        name: 'Practice Assistant',
        description: 'Exercises, coding challenges, and hands-on activities'
      },
      [AgentType.RESEARCH]: {
        name: 'Research Assistant',
        description: 'Information gathering and analysis'
      },
      [AgentType.COLLABORATION]: {
        name: 'Collaboration Assistant',
        description: 'Group work facilitation and peer interaction'
      },
      [AgentType.TITLE_GENERATION]: {
        name: 'Title Generation Assistant',
        description: 'Generate concise, descriptive session titles'
      }
    };

    return info[agentType] || { name: 'Unknown', description: 'Unknown agent type' };
  }

  async cleanup(): Promise<void> {
    this.agentCache.clear();

    if (this.isInitialized) {
      try {
        await window.electronAPI.langchain.cleanup();
      } catch (error) {
        console.error('Failed to cleanup LangChain service:', error);
      }
    }

    console.log('AgentManager cleaned up');
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('AgentManager is not initialized');
    }
  }
}
```

#### 3.2 Update Components to Use IPC

**src/components/Chat/ChatInterface.tsx (Updated):**
```typescript
import React, { useState, useEffect, useRef } from 'react';
import { AgentManager, AgentType } from '@/services/AgentManager';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

export function ChatInterface() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [agentManager] = useState(() => new AgentManager());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentAgent) return;

    // Add user message
    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get or create learning agent
      const agentId = currentAgent || await agentManager.getAgent(AgentType.LEARNING);

      // Send message via IPC
      const response = await agentManager.sendMessage(agentId, content);

      // Add assistant response
      const assistantMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async (type: AgentType) => {
    try {
      const agentId = await agentManager.getAgent(type);
      setCurrentAgent(agentId);

      // Add system message
      const systemMessage = {
        role: 'assistant',
        content: `Created new ${agentManager.getAgentTypeInfo(type).name}. How can I help you?`
      };
      setMessages(prev => [...prev, systemMessage]);
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const handleStreamMessage = async (content: string) => {
    if (!currentAgent) return;

    // Add user message
    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get streaming response
      const stream = await agentManager.sendMessageStream(currentAgent, content);

      // Create placeholder for streaming response
      const streamingMessage = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, streamingMessage]);

      // Process stream
      for await (const chunk of stream) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content += chunk;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Failed to stream message:', error);
      // Remove streaming message and add error
      setMessages(prev => {
        const newMessages = prev.slice(0, -1); // Remove empty streaming message
        newMessages.push({
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}`
        });
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="animate-pulse bg-gray-200 rounded-full h-4 w-4"></div>
            <div className="animate-pulse bg-gray-200 rounded-full h-4 w-4" style={{ animationDelay: '0.1s' }}></div>
            <div className="animate-pulse bg-gray-200 rounded-full h-4 w-4" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="mb-4 flex space-x-2">
          {Object.values(AgentType).map(type => (
            <button
              key={type}
              onClick={() => handleCreateAgent(type)}
              className={`px-3 py-1 rounded text-sm ${
                currentAgent
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {agentManager.getAgentTypeInfo(type).name}
            </button>
          ))}
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          onStreamMessage={handleStreamMessage}
          disabled={isLoading || !currentAgent}
          placeholder={currentAgent ? "Type your message..." : "Select an agent type above"}
        />
      </div>
    </div>
  );
}
```

#### 3.3 Testing Strategy

**Test Implementation:**
```typescript
// src/test/integration/langchain-migration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserWindow, app } from 'electron';

describe('LangChain Migration Integration', () => {
  let window: BrowserWindow;

  beforeAll(async () => {
    await app.whenReady();
    window = new BrowserWindow({ show: false });
  });

  afterAll(async () => {
    if (window) {
      window.close();
    }
    await app.quit();
  });

  it('should initialize LangChain service in main thread', async () => {
    const result = await window.webContents.executeJavaScript(`
      new Promise(async (resolve) => {
        const initResult = await window.electronAPI.langchain.initialize();
        resolve(initResult);
      })
    `);

    expect(result.success).toBe(true);
  });

  it('should create agents in main thread', async () => {
    const result = await window.webContents.executeJavaScript(`
      new Promise(async (resolve) => {
        await window.electronAPI.langchain.initialize();
        const agentResult = await window.electronAPI.langchain.createAgent('learning');
        resolve(agentResult);
      })
    `);

    expect(result.success).toBe(true);
    expect(result.agentId).toBeDefined();
    expect(typeof result.agentId).toBe('string');
  });

  it('should handle streaming messages via IPC', async () => {
    const result = await window.webContents.executeJavaScript(`
      new Promise(async (resolve) => {
        await window.electronAPI.langchain.initialize();
        const agentId = await window.electronAPI.langchain.createAgent('learning');

        const stream = await window.electronAPI.langchain.sendMessageStream(
          agentId.agentId,
          'Hello, explain quantum computing in simple terms'
        );

        let response = '';
        stream.onChunk(chunk => response += chunk);
        stream.onEnd(() => resolve({ success: true, response }));
        stream.onError(error => resolve({ success: false, error }));
      })
    `);

    expect(result.success).toBe(true);
    expect(result.response).toContain('quantum');
  });

  it('should execute tools with database access', async () => {
    const result = await window.webContents.executeJavaScript(`
      new Promise(async (resolve) => {
        await window.electronAPI.langchain.initialize();
        const agentId = await window.electronAPI.langchain.createAgent('learning');

        const toolResult = await window.electronAPI.langchain.executeTool(
          'parse_concepts',
          agentId.agentId,
          {
            content: 'Machine learning is a subset of artificial intelligence.',
            session_id: 'test-session'
          }
        );

        resolve(toolResult);
      })
    `);

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it('should search sessions via main thread service', async () => {
    const result = await window.webContents.executeJavaScript(`
      new Promise(async (resolve) => {
        await window.electronAPI.langchain.initialize();

        const searchResult = await window.electronAPI.langchain.searchSessions({
          query: 'test',
          limit: 5
        });

        resolve(searchResult);
      })
    `);

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.sessions)).toBe(true);
  });
});
```

## Implementation Checklist

### Phase 1 Tasks (Day 1)
- [ ] Create main thread service architecture
- [ ] Implement LangChainService with dependency injection
- [ ] Implement SessionServiceMain with direct database access
- [ ] Implement ConfigServiceMain
- [ ] Create IPC handlers for all services
- [ ] Update preload script with comprehensive API
- [ ] Set up error handling and logging

### Phase 2 Tasks (Day 2)
- [ ] Implement AgentManagerMain with full LangChain support
- [ ] Create tool execution service with database access
- [ ] Migrate all learning tools to main thread
- [ ] Implement concept parsing service in main thread
- [ ] Add streaming support via MessageChannelMain
- [ ] Test agent functionality with AsyncLocalStorage

### Phase 3 Tasks (Day 3)
- [ ] Update renderer services to IPC proxies
- [ ] Remove business logic from renderer
- [ ] Update React components to use IPC
- [ ] Implement comprehensive error boundaries
- [ ] Add performance monitoring
- [ ] Create integration tests
- [ ] Validate all existing functionality

### Success Metrics
- [ ] All LangChain features work without AsyncLocalStorage errors
- [ ] Agent tools can access database directly
- [ ] UI remains responsive during AI operations
- [ ] Streaming responses work correctly via IPC
- [ ] No regressions in existing functionality
- [ ] Performance improves or remains stable
- [ ] Memory usage stays within acceptable limits

This detailed implementation plan provides a complete roadmap for migrating LangChain to the main thread while solving both the AsyncLocalStorage browser compatibility issue and the agent tool database dependency problem.