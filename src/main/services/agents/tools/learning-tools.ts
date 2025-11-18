/**
 * Learning Tools Implementation
 *
 * Provides specialized tools for learning agents including concept parsing,
 * knowledge graph integration, session search, and educational content analysis.
 * Implements secure tool execution with comprehensive error handling.
 */

import { DynamicTool } from '@langchain/core/tools';
import { ToolExecutorService } from '../../tool-executor';
import { SecurityLevel, PermissionType, SecureToolExecutor } from '../../security/secure-tool-executor';
import { ServiceDependencies } from '../../types';

/**
 * Concept parsing result structure
 */
export interface ConceptParsingResult {
  concepts: Array<{
    name: string;
    definition: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    prerequisites: string[];
    relatedConcepts: string[];
    examples: string[];
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: 'prerequisite' | 'related' | 'contains' | 'builds_on';
    strength: number; // 0-1
  }>;
  summary: string;
  estimatedTime: number; // minutes to learn
  metadata: {
    parsingTime: number;
    confidence: number;
    sources: string[];
  };
}

/**
 * Session search result
 */
export interface SessionSearchResult {
  sessions: Array<{
    id: string;
    title: string;
    summary: string;
    concepts: string[];
    timestamp: number;
    relevanceScore: number;
    excerpt: string;
  }>;
  totalResults: number;
  searchTime: number;
  metadata: {
    query: string;
    filters: Record<string, any>;
    sortCriteria: string;
  };
}

/**
 * Learning path generation result
 */
export interface LearningPathResult {
  path: Array<{
    step: number;
    concept: string;
    description: string;
    estimatedTime: number;
    resources: Array<{
      type: 'article' | 'video' | 'exercise' | 'quiz';
      title: string;
      url?: string;
      content?: string;
    }>;
    prerequisites: string[];
    objectives: string[];
  }>;
  totalTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  metadata: {
    generatedAt: number;
    targetAudience: string;
    adaptationLevel: number;
  };
}

/**
 * Learning Tools Factory
 *
 * Creates LangChain-compatible tools for learning operations
 * with secure execution and comprehensive error handling.
 */
export class LearningToolsFactory {
  private readonly secureToolExecutor: SecureToolExecutor;
  private readonly dependencies: ServiceDependencies;

  constructor(dependencies: ServiceDependencies, secureToolExecutor: SecureToolExecutor) {
    this.dependencies = dependencies;
    this.secureToolExecutor = secureToolExecutor;
  }

  /**
   * Create concept parsing tool
   */
  createConceptParsingTool(): DynamicTool {
    return new DynamicTool({
      name: 'concept_parsing',
      description: 'Parse and analyze educational content to extract concepts, relationships, and learning structure',
      func: async (input: string) => {
        try {
          this.dependencies.logger.info('Executing concept parsing tool', { inputLength: input.length });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'concept-parsing',
            operation: 'parse_concepts',
            parameters: {
              content: input,
              options: {
                extractRelationships: true,
                generateExamples: true,
                estimateDifficulty: true
              }
            },
            agentId: 'learning-agent',
            securityLevel: SecurityLevel.STANDARD,
            permissions: [PermissionType.DATABASE_READ, PermissionType.DATABASE_WRITE]
          });

          if (!result.success) {
            throw new Error(`Concept parsing failed: ${result.error?.message}`);
          }

          const parsingResult: ConceptParsingResult = result.data;

          // Format result for LangChain
          return JSON.stringify({
            concepts: parsingResult.concepts.length,
            relationships: parsingResult.relationships.length,
            summary: parsingResult.summary,
            estimatedTime: parsingResult.estimatedTime,
            topConcepts: parsingResult.concepts.slice(0, 5).map(c => c.name),
            confidence: parsingResult.metadata.confidence
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Concept parsing tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'Educational content to analyze for concepts and relationships'
          }
        },
        required: ['content']
      }
    });
  }

  /**
   * Create session search tool
   */
  createSessionSearchTool(): DynamicTool {
    return new DynamicTool({
      name: 'session_search',
      description: 'Search through previous learning sessions to find relevant content and context',
      func: async (input: string) => {
        try {
          const searchQuery = JSON.parse(input);
          this.dependencies.logger.info('Executing session search tool', { query: searchQuery.query });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'session-search',
            operation: 'search_sessions',
            parameters: {
              query: searchQuery.query,
              filters: searchQuery.filters || {},
              limit: searchQuery.limit || 10,
              sortBy: searchQuery.sortBy || 'relevance'
            },
            agentId: 'learning-agent',
            securityLevel: SecurityLevel.RESTRICTED,
            permissions: [PermissionType.DATABASE_READ]
          });

          if (!result.success) {
            throw new Error(`Session search failed: ${result.error?.message}`);
          }

          const searchResult: SessionSearchResult = result.data;

          // Format result for LangChain
          return JSON.stringify({
            totalResults: searchResult.totalResults,
            searchTime: searchResult.searchTime,
            topSessions: searchResult.sessions.slice(0, 5).map(session => ({
              title: session.title,
              concepts: session.concepts,
              relevanceScore: session.relevanceScore,
              excerpt: session.excerpt.substring(0, 200) + '...'
            }))
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Session search tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to find relevant learning sessions'
          },
          filters: {
            type: 'object',
            description: 'Optional filters to narrow search results',
            properties: {
              dateRange: { type: 'string' },
              concepts: { type: 'array', items: { type: 'string' } },
              difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
            }
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10
          },
          sortBy: {
            type: 'string',
            description: 'Sort criteria for results',
            enum: ['relevance', 'date', 'title'],
            default: 'relevance'
          }
        },
        required: ['query']
      }
    });
  }

  /**
   * Create learning path generation tool
   */
  createLearningPathTool(): DynamicTool {
    return new DynamicTool({
      name: 'learning_path_generator',
      description: 'Generate personalized learning paths based on goals, current knowledge, and prerequisites',
      func: async (input: string) => {
        try {
          const pathRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing learning path generation', {
            goal: pathRequest.goal,
            currentLevel: pathRequest.currentLevel
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'learning-path-generator',
            operation: 'generate_path',
            parameters: {
              goal: pathRequest.goal,
              currentLevel: pathRequest.currentLevel || 'beginner',
              timeAvailable: pathRequest.timeAvailable || 60, // minutes
              preferredFormat: pathRequest.preferredFormat || 'mixed',
              existingKnowledge: pathRequest.existingKnowledge || []
            },
            agentId: 'learning-agent',
            securityLevel: SecurityLevel.STANDARD,
            permissions: [PermissionType.DATABASE_READ, PermissionType.DATABASE_WRITE]
          });

          if (!result.success) {
            throw new Error(`Learning path generation failed: ${result.error?.message}`);
          }

          const pathResult: LearningPathResult = result.data;

          // Format result for LangChain
          return JSON.stringify({
            totalTime: pathResult.totalTime,
            difficulty: pathResult.difficulty,
            stepsCount: pathResult.path.length,
            overview: pathResult.path.map(step => ({
              step: step.step,
              concept: step.concept,
              estimatedTime: step.estimatedTime,
              objectives: step.objectives.slice(0, 2) // First 2 objectives
            })),
            adaptationLevel: pathResult.metadata.adaptationLevel
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Learning path generation tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          goal: {
            type: 'string',
            description: 'Learning goal or topic to master'
          },
          currentLevel: {
            type: 'string',
            description: 'Current knowledge level',
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
          },
          timeAvailable: {
            type: 'number',
            description: 'Available time in minutes',
            default: 60
          },
          preferredFormat: {
            type: 'string',
            description: 'Preferred learning format',
            enum: ['visual', 'text', 'interactive', 'mixed'],
            default: 'mixed'
          },
          existingKnowledge: {
            type: 'array',
            description: 'List of already known concepts',
            items: { type: 'string' },
            default: []
          }
        },
        required: ['goal']
      }
    });
  }

  /**
   * Create knowledge graph query tool
   */
  createKnowledgeGraphTool(): DynamicTool {
    return new DynamicTool({
      name: 'knowledge_graph_query',
      description: 'Query the knowledge graph to find concept relationships and dependencies',
      func: async (input: string) => {
        try {
          const queryRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing knowledge graph query', {
            concept: queryRequest.concept,
            queryType: queryRequest.queryType
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'knowledge-graph-query',
            operation: 'query_graph',
            parameters: {
              concept: queryRequest.concept,
              queryType: queryRequest.queryType || 'related',
              depth: queryRequest.depth || 2,
              includeDefinitions: queryRequest.includeDefinitions !== false
            },
            agentId: 'learning-agent',
            securityLevel: SecurityLevel.RESTRICTED,
            permissions: [PermissionType.DATABASE_READ]
          });

          if (!result.success) {
            throw new Error(`Knowledge graph query failed: ${result.error?.message}`);
          }

          const graphResult = result.data;

          // Format result for LangChain
          return JSON.stringify({
            concept: queryRequest.concept,
            queryType: queryRequest.queryType,
            relatedConcepts: graphResult.concepts || [],
            relationships: graphResult.relationships || [],
            totalConnections: (graphResult.concepts?.length || 0) + (graphResult.relationships?.length || 0),
            queryTime: graphResult.queryTime || 0
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Knowledge graph query tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          concept: {
            type: 'string',
            description: 'Central concept to query'
          },
          queryType: {
            type: 'string',
            description: 'Type of query to perform',
            enum: ['related', 'prerequisites', 'dependents', 'similar'],
            default: 'related'
          },
          depth: {
            type: 'number',
            description: 'Depth of relationship traversal',
            default: 2
          },
          includeDefinitions: {
            type: 'boolean',
            description: 'Include concept definitions in results',
            default: true
          }
        },
        required: ['concept']
      }
    });
  }

  /**
   * Create progress tracking tool
   */
  createProgressTrackingTool(): DynamicTool {
    return new DynamicTool({
      name: 'progress_tracking',
      description: 'Track and analyze learning progress over time',
      func: async (input: string) => {
        try {
          const progressRequest = JSON.parse(input);
          this.dependencies.logger.info('Executing progress tracking', {
            sessionId: progressRequest.sessionId,
            timeframe: progressRequest.timeframe
          });

          const result = await this.secureToolExecutor.executeSecureTool({
            toolId: 'progress-tracking',
            operation: 'analyze_progress',
            parameters: {
              sessionId: progressRequest.sessionId,
              timeframe: progressRequest.timeframe || 'week',
              metrics: progressRequest.metrics || ['concepts', 'time', 'performance']
            },
            agentId: 'learning-agent',
            securityLevel: SecurityLevel.RESTRICTED,
            permissions: [PermissionType.DATABASE_READ]
          });

          if (!result.success) {
            throw new Error(`Progress tracking failed: ${result.error?.message}`);
          }

          const progressResult = result.data;

          // Format result for LangChain
          return JSON.stringify({
            timeframe: progressRequest.timeframe,
            conceptsLearned: progressResult.conceptsLearned || 0,
            timeSpent: progressResult.timeSpent || 0,
            averagePerformance: progressResult.averagePerformance || 0,
            trends: progressResult.trends || {},
            recommendations: progressResult.recommendations || []
          }, null, 2);

        } catch (error) {
          this.dependencies.logger.error('Progress tracking tool failed', error as Error);
          throw error;
        }
      },
      schema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID to track progress for'
          },
          timeframe: {
            type: 'string',
            description: 'Time period for analysis',
            enum: ['day', 'week', 'month', 'all'],
            default: 'week'
          },
          metrics: {
            type: 'array',
            description: 'Metrics to include in analysis',
            items: { type: 'string' },
            default: ['concepts', 'time', 'performance']
          }
        },
        required: ['sessionId']
      }
    });
  }

  /**
   * Get all learning tools
   */
  getAllLearningTools(): DynamicTool[] {
    return [
      this.createConceptParsingTool(),
      this.createSessionSearchTool(),
      this.createLearningPathTool(),
      this.createKnowledgeGraphTool(),
      this.createProgressTrackingTool()
    ];
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: 'analysis' | 'search' | 'planning' | 'tracking'): DynamicTool[] {
    const allTools = this.getAllLearningTools();

    switch (category) {
    case 'analysis':
      return allTools.filter(tool =>
        ['concept_parsing', 'knowledge_graph_query'].includes(tool.name)
      );
    case 'search':
      return allTools.filter(tool => tool.name === 'session_search');
    case 'planning':
      return allTools.filter(tool => tool.name === 'learning_path_generator');
    case 'tracking':
      return allTools.filter(tool => tool.name === 'progress_tracking');
    default:
      return [];
    }
  }
}