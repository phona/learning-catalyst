/**
 * Multi-Layer Memory System - Phase 8.2 Implementation
 *
 * Advanced memory management system for Learning Catalyst that provides
 * hierarchical storage across multiple memory layers with intelligent
 * caching, retrieval, and consolidation mechanisms.
 *
 * Memory Architecture:
 * - Working Memory: Short-term, high-speed cache for active learning
 * - Episodic Memory: Session-based learning experiences and interactions
 * - Semantic Memory: Knowledge concepts and relationships
 * - Procedural Memory: Learning strategies and methods
 * - Long-term Memory: Persistent knowledge consolidation
 */

import { Kysely, sql } from 'kysely';
import { Database } from './kysely-schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Memory entry types for different cognitive storage
 */
export enum MemoryType {
  WORKING = 'working',           // Temporary, active processing
  EPISODIC = 'episodic',       // Learning experiences and sessions
  SEMANTIC = 'semantic',       // Knowledge and concepts
  PROCEDURAL = 'procedural',   // Learning strategies and methods
  LONG_TERM = 'long_term'      // Consolidated persistent knowledge
}

/**
 * Memory importance levels for retention decisions
 */
export enum MemoryImportance {
  CRITICAL = 'critical',       // Essential knowledge, never forget
  HIGH = 'high',              // Important concepts, long retention
  MEDIUM = 'medium',           // Useful information, medium retention
  LOW = 'low',                // Minor details, short retention
  TEMPORARY = 'temporary'      // Working memory, quick expiration
}

/**
 * Memory consolidation states
 */
export enum ConsolidationState {
  PENDING = 'pending',         // Awaiting consolidation
  IN_PROGRESS = 'in_progress', // Currently being consolidated
  COMPLETED = 'completed',     // Successfully consolidated
  FAILED = 'failed',          // Consolidation failed
  SCHEDULED = 'scheduled'     // Scheduled for future consolidation
}

/**
 * Memory retrieval strength metrics
 */
export interface RetrievalStrength {
  frequency: number;           // How often accessed
  recency: number;            // How recently accessed
  context: number;            // Context relevance score
  association: number;        // Association strength with other memories
  overall: number;            // Combined strength score (0-1)
}

/**
 * Core memory entry structure
 */
export interface MemoryEntry {
  id: string;
  type: MemoryType;
  importance: MemoryImportance;
  content: any;               // Memory content (varies by type)
  metadata: {
    sessionId: string;
    userId: string;
    timestamp: number;
    source: 'ai_generation' | 'user_input' | 'system' | 'consolidation';
    tags: string[];
    confidence: number;        // Confidence in memory accuracy
    emotional: {              // Emotional context for memory
      valence: number;         // Positive/negative (-1 to 1)
      arousal: number;         // Intensity (0 to 1)
      dominance: number;       // Control/power (0 to 1)
    };
    cognitive: {
      complexity: number;      // Cognitive complexity (0-1)
      abstraction: number;     // Level of abstraction (0-1)
      connections: number;     // Number of connections
    };
  };
  retrieval: RetrievalStrength;
  consolidation: {
    state: ConsolidationState;
    lastAttempt: number;
    attempts: number;
    nextReview: number;
    spacedRepetitionInterval: number;
  };
  associations: {
    related: string[];         // Related memory IDs
    prerequisites: string[];   // Prerequisite memory IDs
    dependents: string[];      // Dependent memory IDs
    conflicts: string[];       // Conflicting memory IDs
  };
  access: {
    accessCount: number;
    lastAccessed: number;
    averageAccessTime: number;
    accessPatterns: number[];  // Access timestamps for pattern analysis
  };
}

/**
 * Working memory structure for temporary cognitive processing
 */
export interface WorkingMemorySlot {
  id: string;
  content: any;
  type: 'concept' | 'process' | 'goal' | 'context' | 'temporary';
  priority: number;           // 0-1, higher = more important
  capacity: number;           // Memory capacity usage (0-1)
  expiration: number;         // Expiration timestamp
  sessionId: string;
  metadata: {
    source: string;
    createdAt: number;
    lastUpdated: number;
    accessCount: number;
  };
}

/**
 * Episodic memory for learning experiences
 */
export interface EpisodicMemory {
  id: string;
  sessionId: string;
  userId: string;
  sequence: {
    stepNumber: number;
    action: string;
    content: any;
    timestamp: number;
    duration: number;
  }[];
  context: {
    learningObjective: string;
    difficulty: string;
    learningStyle: string;
    environment: string;
    tools: string[];
  };
  outcomes: {
    success: boolean;
    confidence: number;
    learningGains: number;
    emotionalResponse: number;
    timeSpent: number;
  };
  reflections: {
    selfAssessment: string;
    insights: string[];
    challenges: string[];
    improvements: string[];
  };
}

/**
 * Semantic memory for knowledge representation
 */
export interface SemanticMemory {
  id: string;
  concept: string;
  definition: string;
  attributes: {
    [key: string]: any;
  };
  relationships: {
    type: 'is_a' | 'has_a' | 'part_of' | 'causes' | 'enables' | 'requires';
    target: string;
    strength: number;
    context: string;
  }[];
  examples: string[];
  misconceptions: string[];
  category: string;
  domain: string;
  difficulty: string;
  abstractions: {
    level: number;            // 0=concrete, 1=abstract, 2=very abstract
    generalizations: string[];
    specializations: string[];
  };
}

/**
 * Procedural memory for learning strategies
 */
export interface ProceduralMemory {
  id: string;
  strategy: string;
  steps: {
    order: number;
    action: string;
    conditions: string[];
    expectedOutcome: string;
    alternatives: string[];
  }[];
  context: {
    learningStyles: string[];
    subjects: string[];
    difficulties: string[];
    environments: string[];
  };
  effectiveness: {
    successRate: number;
    averageTime: number;
    userSatisfaction: number;
    learningGains: number;
  };
  adaptations: {
    modifications: string[];
    personalizedAdjustments: string[];
    contextualVariations: string[];
  };
}

/**
 * Memory consolidation configuration
 */
export interface MemoryConsolidationConfig {
  workingMemoryCapacity: number;     // Number of working memory slots
  workingMemoryTTL: number;         // Time-to-live for working memory (ms)
  episodicRetentionPeriod: number;  // How long to keep episodic memories (ms)
  semanticThreshold: number;        // Confidence threshold for semantic memory
  proceduralMasteryThreshold: number; // Success rate for procedural mastery
  consolidationInterval: number;    // How often to run consolidation (ms)
  spacingAlgorithm: 'sm2' | 'fsrs' | 'custom'; // Spaced repetition algorithm
  maxConsolidationBatch: number;    // Max memories to consolidate at once
}

/**
 * Multi-layer memory system implementation
 */
export class MultiLayerMemorySystem {
  private db: Kysely<Database>;
  private config: MemoryConsolidationConfig;
  private workingMemory: Map<string, WorkingMemorySlot> = new Map();
  private consolidationQueue: Set<string> = new Set();
  private lastConsolidation: number = 0;
  private logger: any;

  constructor(
    db: Kysely<Database>,
    config: Partial<MemoryConsolidationConfig> = {}
  ) {
    this.db = db;
    this.config = {
      workingMemoryCapacity: 7,        // Miller's magic number
      workingMemoryTTL: 30 * 60 * 1000, // 30 minutes
      episodicRetentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
      semanticThreshold: 0.8,
      proceduralMasteryThreshold: 0.9,
      consolidationInterval: 60 * 60 * 1000, // 1 hour
      spacingAlgorithm: 'sm2',
      maxConsolidationBatch: 50,
      ...config
    };

    // Initialize logger (in real implementation, would be injected)
    this.logger = {
      info: (msg: string, meta?: any) => console.log(`[MemorySystem] ${msg}`, meta || ''),
      warn: (msg: string, meta?: any) => console.warn(`[MemorySystem] ${msg}`, meta || ''),
      error: (msg: string, meta?: any) => console.error(`[MemorySystem] ${msg}`, meta || '')
    };

    this.initializeMemorySystem();
  }

  /**
   * Initialize the memory system and create necessary tables
   */
  private async initializeMemorySystem(): Promise<void> {
    try {
      this.logger.info(`Initializing Multi-Layer Memory System`, {
        config: this.config
      });

      // Create memory tables if they don't exist
      await this.createMemoryTables();

      // Start consolidation timer
      this.startConsolidationTimer();

      // Clean up expired working memory
      this.startWorkingMemoryCleanup();

      this.logger.info(`✅ Multi-Layer Memory System initialized successfully`);

    } catch (error) {
      this.logger.error(`Failed to initialize memory system`, error as Error);
      throw error;
    }
  }

  /**
   * Create database tables for memory storage
   */
  private async createMemoryTables(): Promise<void> {
    try {
      // Create main memory table
      await sql`
        CREATE TABLE IF NOT EXISTS memory_entries (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          importance TEXT NOT NULL,
          content TEXT, -- JSON serialized
          metadata TEXT, -- JSON serialized
          retrieval_strength REAL DEFAULT 0,
          consolidation_state TEXT DEFAULT 'pending',
          consolidation_data TEXT, -- JSON serialized
          associations TEXT, -- JSON serialized
          access_data TEXT, -- JSON serialized
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `.execute(this.db);

      // Create episodic memory table
      await sql`
        CREATE TABLE IF NOT EXISTS episodic_memories (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          sequence TEXT, -- JSON serialized
          context TEXT, -- JSON serialized
          outcomes TEXT, -- JSON serialized
          reflections TEXT, -- JSON serialized
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `.execute(this.db);

      // Create semantic memory table
      await sql`
        CREATE TABLE IF NOT EXISTS semantic_memories (
          id TEXT PRIMARY KEY,
          concept TEXT NOT NULL,
          definition TEXT,
          attributes TEXT, -- JSON serialized
          relationships TEXT, -- JSON serialized
          examples TEXT, -- JSON serialized
          misconceptions TEXT, -- JSON serialized
          category TEXT,
          domain TEXT,
          difficulty TEXT,
          abstractions TEXT, -- JSON serialized
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `.execute(this.db);

      // Create procedural memory table
      await sql`
        CREATE TABLE IF NOT EXISTS procedural_memories (
          id TEXT PRIMARY KEY,
          strategy TEXT NOT NULL,
          steps TEXT, -- JSON serialized
          context TEXT, -- JSON serialized
          effectiveness TEXT, -- JSON serialized
          adaptations TEXT, -- JSON serialized
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `.execute(this.db);

      // Create memory associations table
      await sql`
        CREATE TABLE IF NOT EXISTS memory_associations (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          type TEXT NOT NULL,
          strength REAL DEFAULT 0.5,
          context TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (source_id) REFERENCES memory_entries(id),
          FOREIGN KEY (target_id) REFERENCES memory_entries(id)
        )
      `.execute(this.db);

      // Create indexes for performance
      await sql`CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(type)`.execute(this.db);
      await sql`CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory_entries(importance)`.execute(this.db);
      await sql`CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_entries(JSON_EXTRACT(metadata, '$.sessionId'))`.execute(this.db);
      await sql`CREATE INDEX IF NOT EXISTS idx_episodic_session ON episodic_memories(session_id)`.execute(this.db);
      await sql`CREATE INDEX IF NOT EXISTS idx_semantic_concept ON semantic_memories(concept)`.execute(this.db);
      await sql`CREATE INDEX IF NOT EXISTS idx_procedural_strategy ON procedural_memories(strategy)`.execute(this.db);

      this.logger.info(`Memory tables created successfully`);

    } catch (error) {
      this.logger.error(`Failed to create memory tables`, error as Error);
      throw error;
    }
  }

  /**
   * Store memory in appropriate layer based on type and importance
   */
  async storeMemory(memory: Omit<MemoryEntry, 'id' | 'retrieval' | 'consolidation' | 'access'>): Promise<string> {
    const memoryId = uuidv4();
    const now = Date.now();

    const completeMemory: MemoryEntry = {
      ...memory,
      id: memoryId,
      retrieval: {
        frequency: 0,
        recency: now,
        context: 0.5,
        association: 0.5,
        overall: 0.5
      },
      consolidation: {
        state: ConsolidationState.PENDING,
        lastAttempt: 0,
        attempts: 0,
        nextReview: now + (24 * 60 * 60 * 1000), // Review tomorrow
        spacedRepetitionInterval: 1
      },
      access: {
        accessCount: 0,
        lastAccessed: now,
        averageAccessTime: 0,
        accessPatterns: []
      }
    };

    try {
      // Route to appropriate storage based on memory type
      switch (memory.type) {
        case MemoryType.WORKING:
          await this.storeWorkingMemory(completeMemory);
          break;

        case MemoryType.EPISODIC:
          await this.storeEpisodicMemory(completeMemory);
          break;

        case MemoryType.SEMANTIC:
          await this.storeSemanticMemory(completeMemory);
          break;

        case MemoryType.PROCEDURAL:
          await this.storeProceduralMemory(completeMemory);
          break;

        case MemoryType.LONG_TERM:
          await this.storeLongTermMemory(completeMemory);
          break;
      }

      // Store base memory entry
      await this.db
        .insertInto('memory_entries')
        .values({
          id: memoryId,
          type: memory.type,
          importance: sql`${memory.importance}`,
          content: JSON.stringify(memory.content),
          metadata: JSON.stringify(memory.metadata),
          retrieval_strength: completeMemory.retrieval.overall,
          consolidation_state: sql`${completeMemory.consolidation.state}`,
          consolidation_data: JSON.stringify(completeMemory.consolidation),
          associations: JSON.stringify(completeMemory.associations),
          access_data: JSON.stringify(completeMemory.access)
        })
        .execute();

      // Schedule for consolidation if needed
      if (memory.type !== MemoryType.WORKING && memory.importance !== MemoryImportance.TEMPORARY) {
        this.consolidationQueue.add(memoryId);
      }

      this.logger.info(`Memory stored successfully`, {
        memoryId,
        type: memory.type,
        importance: memory.importance,
        sessionId: memory.metadata.sessionId
      });

      return memoryId;

    } catch (error) {
      this.logger.error(`Failed to store memory`, {
        type: memory.type,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Retrieve memory with intelligent routing and strength calculation
   */
  async retrieveMemory(
    memoryId: string,
    options: {
      includeRelated?: boolean;
      updateStrength?: boolean;
      context?: string;
    } = {}
  ): Promise<MemoryEntry | null> {
    try {
      // Try working memory first (fastest)
      const workingMemory = this.workingMemory.get(memoryId);
      if (workingMemory) {
        return this.convertWorkingMemoryToMemoryEntry(workingMemory);
      }

      // Retrieve from database
      const memoryRecord = await this.db
        .selectFrom('memory_entries')
        .selectAll()
        .where('id', '=', memoryId)
        .executeTakeFirst();

      if (!memoryRecord) {
        return null;
      }

      // Parse memory data
      const memory: MemoryEntry = {
        id: memoryRecord.id,
        type: memoryRecord.type as MemoryType,
        importance: memoryRecord.importance as MemoryImportance,
        content: JSON.parse(memoryRecord.content || '{}'),
        metadata: JSON.parse(memoryRecord.metadata || '{}'),
        retrieval: {
          frequency: 0,
          recency: Date.now(),
          context: options.context ? 0.8 : 0.5,
          association: 0.5,
          overall: memoryRecord.retrieval_strength || 0.5
        },
        consolidation: JSON.parse(memoryRecord.consolidation_data || '{}'),
        associations: JSON.parse(memoryRecord.associations || '{}'),
        access: JSON.parse(memoryRecord.access_data || '{}')
      };

      // Update retrieval strength if requested
      if (options.updateStrength) {
        await this.updateRetrievalStrength(memoryId, options.context);
      }

      // Include related memories if requested
      if (options.includeRelated) {
        const relatedMemories = await this.getRelatedMemories(memoryId);
        // Add related memories to the result (would be implemented in a real system)
      }

      this.logger.info(`Memory retrieved successfully`, {
        memoryId,
        type: memory.type,
        strength: memory.retrieval.overall
      });

      return memory;

    } catch (error) {
      this.logger.error(`Failed to retrieve memory`, {
        memoryId,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Search memories by content, type, or metadata
   */
  async searchMemories(query: {
    text?: string;
    type?: MemoryType;
    sessionId?: string;
    userId?: string;
    tags?: string[];
    importance?: MemoryImportance;
    timeRange?: { start: number; end: number };
    limit?: number;
  }): Promise<MemoryEntry[]> {
    try {
      let dbQuery = this.db
        .selectFrom('memory_entries')
        .selectAll()
        .orderBy('created_at', 'desc');

      // Apply filters
      if (query.type) {
        dbQuery = dbQuery.where('type', '=', query.type);
      }

      if (query.importance) {
        dbQuery = dbQuery.where('importance', '=', query.importance as any);
      }

      if (query.sessionId) {
        dbQuery = dbQuery.where(
          sql`JSON_EXTRACT(metadata, '$.sessionId')`,
          '=',
          query.sessionId
        );
      }

      if (query.userId) {
        dbQuery = dbQuery.where(
          sql`JSON_EXTRACT(metadata, '$.userId')`,
          '=',
          query.userId
        );
      }

      if (query.timeRange) {
        dbQuery = dbQuery.where('created_at', '>=', query.timeRange.start as any)
          .where('created_at', '<=', query.timeRange.end as any);
      }

      if (query.text) {
        dbQuery = dbQuery.where(
          sql`content`,
          'like',
          `%${query.text}%`
        );
      }

      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }

      const records = await dbQuery.execute();

      // Parse and convert to MemoryEntry objects
      const memories: MemoryEntry[] = records.map(record => ({
        id: record.id,
        type: record.type as MemoryType,
        importance: record.importance as MemoryImportance,
        content: JSON.parse(record.content || '{}'),
        metadata: JSON.parse(record.metadata || '{}'),
        retrieval: {
          frequency: 0,
          recency: Date.now(),
          context: 0.5,
          association: 0.5,
          overall: record.retrieval_strength || 0.5
        },
        consolidation: JSON.parse(record.consolidation_data || '{}'),
        associations: JSON.parse(record.associations || '{}'),
        access: JSON.parse(record.access_data || '{}')
      }));

      // Filter by tags if specified
      if (query.tags && query.tags.length > 0) {
        return memories.filter(memory =>
          query.tags!.some(tag =>
            memory.metadata.tags.includes(tag)
          )
        );
      }

      this.logger.info(`Memory search completed`, {
        query,
        resultCount: memories.length
      });

      return memories;

    } catch (error) {
      this.logger.error(`Memory search failed`, {
        query,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Store working memory slot with capacity management
   */
  private async storeWorkingMemory(memory: MemoryEntry): Promise<void> {
    const slot: WorkingMemorySlot = {
      id: memory.id,
      content: memory.content,
      type: this.inferWorkingMemoryType(memory),
      priority: this.calculateWorkingMemoryPriority(memory),
      capacity: this.calculateMemoryCapacity(memory.content),
      expiration: Date.now() + this.config.workingMemoryTTL,
      sessionId: memory.metadata.sessionId,
      metadata: {
        source: memory.metadata.source,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        accessCount: 0
      }
    };

    // Check capacity and evict if necessary
    await this.manageWorkingMemoryCapacity();

    this.workingMemory.set(memory.id, slot);

    this.logger.debug(`Working memory slot created`, {
      memoryId: memory.id,
      type: slot.type,
      priority: slot.priority,
      capacity: slot.capacity
    });
  }

  /**
   * Store episodic memory with sequence and context
   */
  private async storeEpisodicMemory(memory: MemoryEntry): Promise<void> {
    const episodicData = memory.content as EpisodicMemory;

    await this.db
      .insertInto('episodic_memories')
      .values({
        id: memory.id,
        session_id: memory.metadata.sessionId,
        user_id: memory.metadata.userId,
        sequence: JSON.stringify(episodicData.sequence),
        context: JSON.stringify(episodicData.context),
        outcomes: JSON.stringify(episodicData.outcomes),
        reflections: JSON.stringify(episodicData.reflections)
      })
      .execute();
  }

  /**
   * Store semantic memory with relationships and attributes
   */
  private async storeSemanticMemory(memory: MemoryEntry): Promise<void> {
    const semanticData = memory.content as SemanticMemory;

    await this.db
      .insertInto('semantic_memories')
      .values({
        id: memory.id,
        concept: semanticData.concept,
        definition: semanticData.definition,
        attributes: JSON.stringify(semanticData.attributes),
        relationships: JSON.stringify(semanticData.relationships),
        examples: JSON.stringify(semanticData.examples),
        misconceptions: JSON.stringify(semanticData.misconceptions),
        category: semanticData.category,
        domain: semanticData.domain,
        difficulty: semanticData.difficulty,
        abstractions: JSON.stringify(semanticData.abstractions)
      })
      .execute();

    // Store relationships separately for efficient querying
    await this.storeSemanticRelationships(memory.id, semanticData.relationships);
  }

  /**
   * Store procedural memory with effectiveness tracking
   */
  private async storeProceduralMemory(memory: MemoryEntry): Promise<void> {
    const proceduralData = memory.content as ProceduralMemory;

    await this.db
      .insertInto('procedural_memories')
      .values({
        id: memory.id,
        skill_name: proceduralData.strategy,
        steps: JSON.stringify(proceduralData.steps),
        prerequisites: JSON.stringify([]), // Extract from context in real implementation
        context_conditions: JSON.stringify(proceduralData.context),
        success_criteria: JSON.stringify(proceduralData.effectiveness),
        common_errors: JSON.stringify([]), // Track from adaptations in real implementation
        mastery_level: 0.5, // Calculate from effectiveness
        practice_count: 0,
        success_rate: proceduralData.effectiveness?.successRate || 0,
        automaticity_level: 0.1 // Calculate from practice data
      })
      .execute();
  }

  /**
   * Store long-term memory with highest persistence
   */
  private async storeLongTermMemory(memory: MemoryEntry): Promise<void> {
    // Long-term memories use the main memory table with highest importance
    await this.db
      .updateTable('memory_entries')
      .set({
        importance: MemoryImportance.CRITICAL,
        consolidation_state: ConsolidationState.COMPLETED
      })
      .where('id', '=', memory.id)
      .execute();
  }

  /**
   * Memory consolidation process
   */
  private async consolidateMemories(): Promise<void> {
    if (this.consolidationQueue.size === 0) {
      return;
    }

    this.logger.info(`Starting memory consolidation`, {
      queueSize: this.consolidationQueue.size
    });

    const consolidationBatch = Array.from(this.consolidationQueue)
      .slice(0, this.config.maxConsolidationBatch);

    try {
      for (const memoryId of consolidationBatch) {
        await this.consolidateSingleMemory(memoryId);
        this.consolidationQueue.delete(memoryId);
      }

      this.lastConsolidation = Date.now();

      this.logger.info(`Memory consolidation completed`, {
        processedCount: consolidationBatch.length,
        remainingQueue: this.consolidationQueue.size
      });

    } catch (error) {
      this.logger.error(`Memory consolidation failed`, error as Error);
    }
  }

  /**
   * Consolidate individual memory based on type and strength
   */
  private async consolidateSingleMemory(memoryId: string): Promise<void> {
    const memory = await this.retrieveMemory(memoryId);
    if (!memory) {
      return;
    }

    try {
      // Update consolidation state
      await this.db
        .updateTable('memory_entries')
        .set({
          consolidation_state: ConsolidationState.IN_PROGRESS,
          updated_at: sql`strftime('%s', 'now')`
        })
        .where('id', '=', memoryId)
        .execute();

      // Perform consolidation based on memory type
      switch (memory.type) {
        case MemoryType.WORKING:
          await this.consolidateWorkingMemory(memory);
          break;

        case MemoryType.EPISODIC:
          await this.consolidateEpisodicMemory(memory);
          break;

        case MemoryType.SEMANTIC:
          await this.consolidateSemanticMemory(memory);
          break;

        case MemoryType.PROCEDURAL:
          await this.consolidateProceduralMemory(memory);
          break;
      }

      // Update consolidation state to completed
      await this.db
        .updateTable('memory_entries')
        .set({
          consolidation_state: ConsolidationState.COMPLETED,
          updated_at: sql`strftime('%s', 'now')`
        })
        .where('id', '=', memoryId)
        .execute();

      this.logger.debug(`Memory consolidated successfully`, {
        memoryId,
        type: memory.type
      });

    } catch (error) {
      // Mark consolidation as failed
      await this.db
        .updateTable('memory_entries')
        .set({
          consolidation_state: ConsolidationState.FAILED,
          updated_at: sql`strftime('%s', 'now')`
        })
        .where('id', '=', memoryId)
        .execute();

      this.logger.error(`Memory consolidation failed`, {
        memoryId,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get memory analytics and statistics
   */
  async getMemoryAnalytics(userId?: string): Promise<{
    totalMemories: number;
    memoriesByType: Record<MemoryType, number>;
    memoriesByImportance: Record<MemoryImportance, number>;
    averageRetrievalStrength: number;
    consolidationStats: {
      pending: number;
      inProgress: number;
      consolidated: number;
      failed: number;
    };
    workingMemoryUtilization: number;
    recentActivity: {
      stored: number;
      retrieved: number;
      consolidated: number;
    };
  }> {
    try {
      // Get base statistics
      let baseQuery = this.db
        .selectFrom('memory_entries')
        .select([
          sql<string>`COUNT(*)`.as('total'),
          sql<string>`SUM(retrieval_strength)`.as('total_strength')
        ]);

      if (userId) {
        baseQuery = baseQuery.where(
          sql`JSON_EXTRACT(metadata, '$.userId')`,
          '=',
          sql`${userId}`
        );
      }

      const baseStats = await baseQuery.executeTakeFirst() || { total: '0', total_strength: '0' };

      // Get memories by type
      const typeStats = await this.db
        .selectFrom('memory_entries')
        .select(['type', sql<string>`COUNT(*)`.as('count')])
        .$if(!!userId, (qb) => qb.where(
          sql`JSON_EXTRACT(metadata, '$.userId')`,
          '=',
          userId!
        ))
        .groupBy('type')
        .execute();

      // Get memories by importance
      const importanceStats = await this.db
        .selectFrom('memory_entries')
        .select(['importance', sql<string>`COUNT(*)`.as('count')])
        .$if(!!userId, (qb) => qb.where(
          sql`JSON_EXTRACT(metadata, '$.userId')`,
          '=',
          userId!
        ))
        .groupBy('importance')
        .execute();

      // Get consolidation statistics
      const consolidationStats = await this.db
        .selectFrom('memory_entries')
        .select(['consolidation_state', sql<string>`COUNT(*)`.as('count')])
        .$if(!!userId, (qb) => qb.where(
          sql`JSON_EXTRACT(metadata, '$.userId')`,
          '=',
          userId!
        ))
        .groupBy('consolidation_state')
        .execute();

      // Format results
      const memoriesByType = typeStats.reduce((acc, stat) => {
        acc[stat.type as MemoryType] = parseInt(stat.count);
        return acc;
      }, {} as Record<MemoryType, number>);

      const memoriesByImportance = importanceStats.reduce((acc, stat) => {
        acc[stat.importance as MemoryImportance] = parseInt(stat.count);
        return acc;
      }, {} as Record<MemoryImportance, number>);

      const consolidationStatsFormatted = consolidationStats.reduce((acc, stat) => {
        switch (stat.consolidation_state) {
          case 'pending': acc.pending = parseInt(stat.count); break;
          case 'in_progress': acc.inProgress = parseInt(stat.count); break;
          case 'completed': acc.consolidated = parseInt(stat.count); break;
          case 'failed': acc.failed = parseInt(stat.count); break;
        }
        return acc;
      }, { pending: 0, inProgress: 0, consolidated: 0, failed: 0 });

      return {
        totalMemories: parseInt(baseStats.total),
        memoriesByType,
        memoriesByImportance,
        averageRetrievalStrength: parseFloat(baseStats.total_strength) / Math.max(1, parseInt(baseStats.total)),
        consolidationStats: consolidationStatsFormatted,
        workingMemoryUtilization: this.workingMemory.size / this.config.workingMemoryCapacity,
        recentActivity: {
          stored: 0, // Would track recent activity
          retrieved: 0,
          consolidated: 0
        }
      };

    } catch (error) {
      this.logger.error(`Failed to get memory analytics`, error as Error);
      throw error;
    }
  }

  // Helper methods

  private inferWorkingMemoryType(memory: MemoryEntry): WorkingMemorySlot['type'] {
    if (memory.metadata.tags.includes('goal')) return 'goal';
    if (memory.metadata.tags.includes('process')) return 'process';
    if (memory.metadata.tags.includes('concept')) return 'concept';
    if (memory.metadata.tags.includes('context')) return 'context';
    return 'temporary';
  }

  private calculateWorkingMemoryPriority(memory: MemoryEntry): number {
    let priority = 0.5; // Base priority

    // Adjust based on importance
    switch (memory.importance) {
      case MemoryImportance.CRITICAL: priority += 0.4; break;
      case MemoryImportance.HIGH: priority += 0.3; break;
      case MemoryImportance.MEDIUM: priority += 0.1; break;
      case MemoryImportance.LOW: priority -= 0.1; break;
      case MemoryImportance.TEMPORARY: priority -= 0.3; break;
    }

    // Adjust based on emotional valence
    priority += memory.metadata.emotional.valence * 0.1;

    // Adjust based on confidence
    priority += memory.metadata.confidence * 0.1;

    return Math.max(0, Math.min(1, priority));
  }

  private calculateMemoryCapacity(content: any): number {
    // Simple capacity calculation based on content size
    const size = JSON.stringify(content).length;
    return Math.min(1, size / 1000); // Normalize to 0-1
  }

  private async manageWorkingMemoryCapacity(): Promise<void> {
    if (this.workingMemory.size < this.config.workingMemoryCapacity) {
      return;
    }

    // Sort by priority and expiration, evict lowest priority
    const sortedSlots = Array.from(this.workingMemory.entries())
      .sort(([, a], [, b]) => {
        // First by expiration
        if (a.expiration < Date.now() && b.expiration >= Date.now()) return -1;
        if (b.expiration < Date.now() && a.expiration >= Date.now()) return 1;

        // Then by priority
        return b.priority - a.priority;
      });

    // Evict oldest/lowest priority slots
    const toEvict = sortedSlots.slice(0, sortedSlots.length - this.config.workingMemoryCapacity + 1);

    for (const [memoryId] of toEvict) {
      this.workingMemory.delete(memoryId);

      // Move to episodic memory if worth preserving
      const slot = toEvict.find(([id]) => id === memoryId)?.[1];
      if (slot && slot.priority > 0.3) {
        // Would create episodic memory entry
      }
    }
  }

  private async updateRetrievalStrength(memoryId: string, context?: string): Promise<void> {
    // Update retrieval strength based on access
    await this.db
      .updateTable('memory_entries')
      .set({
        retrieval_strength: sql`CASE
          WHEN retrieval_strength < 0.9 THEN retrieval_strength + 0.05
          ELSE 1.0
        END`,
        updated_at: sql`strftime('%s', 'now')`
      })
      .where('id', '=', memoryId)
      .execute();
  }

  private async getRelatedMemories(memoryId: string): Promise<MemoryEntry[]> {
    // Get related memories through associations
    const associations = await this.db
      .selectFrom('memory_associations')
      .select(['target_id'])
      .where('source_id', '=', memoryId)
      .execute();

    const relatedMemoryIds = associations.map(a => a.target_id);

    if (relatedMemoryIds.length === 0) {
      return [];
    }

    const relatedRecords = await this.db
      .selectFrom('memory_entries')
      .selectAll()
      .where('id', 'in', relatedMemoryIds)
      .execute();

    return relatedRecords.map(record => ({
      id: record.id,
      type: record.type as MemoryType,
      importance: record.importance as MemoryImportance,
      content: JSON.parse(record.content || '{}'),
      metadata: JSON.parse(record.metadata || '{}'),
      retrieval: {
        frequency: 0,
        recency: Date.now(),
        context: 0.5,
        association: 0.5,
        overall: record.retrieval_strength || 0.5
      },
      consolidation: JSON.parse(record.consolidation_data || '{}'),
      associations: JSON.parse(record.associations || '{}'),
      access: JSON.parse(record.access_data || '{}')
    }));
  }

  private convertWorkingMemoryToMemoryEntry(slot: WorkingMemorySlot): MemoryEntry {
    return {
      id: slot.id,
      type: MemoryType.WORKING,
      importance: MemoryImportance.TEMPORARY,
      content: slot.content,
      metadata: {
        sessionId: slot.sessionId,
        userId: 'temp', // Working memory doesn't have user context
        timestamp: slot.metadata.createdAt,
        source: slot.metadata.source as any,
        tags: ['working_memory'],
        confidence: 0.8,
        emotional: { valence: 0, arousal: 0.5, dominance: 0.5 },
        cognitive: { complexity: 0.5, abstraction: 0.3, connections: 1 }
      },
      retrieval: {
        frequency: slot.metadata.accessCount,
        recency: Date.now(),
        context: 0.7,
        association: 0.3,
        overall: 0.6
      },
      consolidation: {
        state: ConsolidationState.PENDING,
        lastAttempt: 0,
        attempts: 0,
        nextReview: Date.now() + (60 * 60 * 1000), // 1 hour
        spacedRepetitionInterval: 1
      },
      associations: {
        related: [],
        prerequisites: [],
        dependents: [],
        conflicts: []
      },
      access: {
        accessCount: slot.metadata.accessCount,
        lastAccessed: Date.now(),
        averageAccessTime: 0,
        accessPatterns: []
      }
    };
  }

  private async storeSemanticRelationships(memoryId: string, relationships: any[]): Promise<void> {
    for (const relationship of relationships) {
      await this.db
        .insertInto('memory_associations')
        .values({
          id: uuidv4(),
          source_id: memoryId,
          target_id: relationship.target,
          type: relationship.type,
          strength: relationship.strength,
          context: relationship.context
        })
        .execute();
    }
  }

  private async consolidateWorkingMemory(memory: MemoryEntry): Promise<void> {
    // Move important working memory to episodic or semantic memory
    if (memory.importance === MemoryImportance.HIGH || memory.importance === MemoryImportance.CRITICAL) {
      // Convert to episodic memory
      const episodicMemory: EpisodicMemory = {
        id: memory.id,
        sessionId: memory.metadata.sessionId,
        userId: memory.metadata.userId,
        sequence: [{
          stepNumber: 1,
          action: 'working_memory_consolidation',
          content: memory.content,
          timestamp: Date.now(),
          duration: 0
        }],
        context: {
          learningObjective: 'working_memory_transfer',
          difficulty: 'unknown',
          learningStyle: 'unknown',
          environment: 'system',
          tools: ['memory_consolidation']
        },
        outcomes: {
          success: true,
          confidence: memory.metadata.confidence,
          learningGains: 0.1,
          emotionalResponse: memory.metadata.emotional.valence,
          timeSpent: 0
        },
        reflections: {
          selfAssessment: 'Automatically consolidated from working memory',
          insights: [],
          challenges: [],
          improvements: []
        }
      };

      // Update memory type and content
      await this.db
        .updateTable('memory_entries')
        .set({
          type: MemoryType.EPISODIC,
          content: JSON.stringify(episodicMemory),
          updated_at: sql`strftime('%s', 'now')`
        })
        .where('id', '=', memory.id)
        .execute();
    }
  }

  private async consolidateEpisodicMemory(memory: MemoryEntry): Promise<void> {
    // Extract semantic knowledge from episodic experiences
    const episodicData = memory.content as EpisodicMemory;

    // Look for patterns and extract semantic concepts
    // This would involve NLP analysis in a real implementation
  }

  private async consolidateSemanticMemory(memory: MemoryEntry): Promise<void> {
    // Strengthen semantic relationships and categorize knowledge
    // Update association strengths and categorization
  }

  private async consolidateProceduralMemory(memory: MemoryEntry): Promise<void> {
    // Optimize procedural steps and improve effectiveness tracking
    // Update success rates and adaptation strategies
  }

  private startConsolidationTimer(): void {
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastConsolidation >= this.config.consolidationInterval) {
        this.consolidateMemories();
      }
    }, this.config.consolidationInterval);
  }

  private startWorkingMemoryCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredSlots: string[] = [];

      for (const [id, slot] of this.workingMemory) {
        if (slot.expiration <= now) {
          expiredSlots.push(id);
        }
      }

      for (const id of expiredSlots) {
        this.workingMemory.delete(id);
      }

      if (expiredSlots.length > 0) {
        this.logger.debug(`Cleaned up expired working memory slots`, {
          expiredCount: expiredSlots.length
        });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Cleanup and dispose of memory system
   */
  async dispose(): Promise<void> {
    this.logger.info(`Disposing Multi-Layer Memory System`);

    // Final consolidation
    await this.consolidateMemories();

    // Clear working memory
    this.workingMemory.clear();
    this.consolidationQueue.clear();

    this.logger.info(`✅ Multi-Layer Memory System disposed`);
  }
}

/**
 * Default memory system configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConsolidationConfig = {
  workingMemoryCapacity: 7,
  workingMemoryTTL: 30 * 60 * 1000, // 30 minutes
  episodicRetentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
  semanticThreshold: 0.8,
  proceduralMasteryThreshold: 0.9,
  consolidationInterval: 60 * 60 * 1000, // 1 hour
  spacingAlgorithm: 'sm2',
  maxConsolidationBatch: 50
};