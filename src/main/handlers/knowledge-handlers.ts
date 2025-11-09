/**
 * Knowledge & Discovery IPC Handlers
 *
 * IPC handlers for knowledge graph management, concept exploration,
 * and intelligent content discovery.
 */

import { ipcMain, MessageChannelMain } from 'electron';
import { getCatalystService } from '../services/catalyst/catalyst-service';
import { LoggerFactory } from '../services/logger';
import { ServiceError } from '../services/types';
import { ConceptProcessingPipeline } from '../services/catalyst/pipeline';
import { LangChainProviderAdapter } from '../services/catalyst/langchain-adapter';
import { createConfigService } from '../services/configService';
import { ElectronStoreConfigStorage } from '../services/config/ElectronStoreStorage';

/**
 * Setup knowledge and discovery IPC handlers
 */
export function setupKnowledgeHandlers(): void {
  const loggerFactory = LoggerFactory.getInstance();
  const logger = loggerFactory.createContextAwareLogger();

  /**
   * Explore a concept in detail
   */
  ipcMain.handle('knowledge:exploreConcept', async (event, params) => {
    logger.info('Exploring concept', {
      conceptName: params.conceptName,
      depth: params.depth
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'KnowledgeHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'knowledge:exploreConcept',
        async () => {
          // Mock concept exploration
          const exploration = {
            concept: {
              id: `concept_${Date.now()}`,
              name: params.conceptName,
              definition: `Detailed definition of ${params.conceptName}`,
              type: 'concept',
              difficulty: params.depth === 'comprehensive' ? 'advanced' : 'intermediate',
              category: 'Programming',
              tags: ['software', 'development'],
              confidence: 0.92,
              evidence: [
                {
                  type: 'documentation',
                  title: `Official ${params.conceptName} Documentation`,
                  url: 'https://example.com/docs',
                  relevance: 0.95
                }
              ]
            },
            relationships: [
              {
                sourceId: `concept_${Date.now()}`,
                targetId: 'related_concept_1',
                type: 'prerequisite-for',
                strength: 0.8,
                targetConcept: {
                  name: 'Advanced Programming',
                  definition: 'More complex programming concepts'
                }
              },
              {
                sourceId: `concept_${Date.now()}`,
                targetId: 'related_concept_2',
                type: 'related-to',
                strength: 0.7,
                targetConcept: {
                  name: 'Software Design',
                  definition: 'Principles of software design'
                }
              }
            ],
            learningResources: [
              {
                type: 'tutorial',
                title: `Getting Started with ${params.conceptName}`,
                url: 'https://example.com/tutorial',
                difficulty: 'beginner',
                estimatedTime: 30,
                rating: 4.5,
                description: 'A comprehensive tutorial for beginners'
              },
              {
                type: 'video',
                title: `${params.conceptName} Explained`,
                url: 'https://example.com/video',
                difficulty: 'intermediate',
                estimatedTime: 45,
                rating: 4.8,
                description: 'Video explanation with practical examples'
              }
            ],
            practicalApplications: [
              {
                title: 'Real-world Project 1',
                description: `Apply ${params.conceptName} in a practical scenario`,
                difficulty: 'intermediate',
                estimatedTime: 120,
                tags: ['practice', 'project']
              }
            ],
            assessmentItems: [
              {
                type: 'quiz',
                title: `Test your ${params.conceptName} knowledge`,
                difficulty: 'intermediate',
                questionCount: 10,
                estimatedTime: 15
              }
            ],
            metadata: {
              explorationDepth: params.depth,
              lastUpdated: new Date().toISOString(),
              confidence: 0.92
            }
          };

          return {
            success: true,
            exploration
          };
        },
        {
          operation: 'knowledge:exploreConcept',
          conceptName: params.conceptName,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to explore concept', error as Error, params);
      throw error;
    }
  });

  /**
   * Get related concepts
   */
  ipcMain.handle('knowledge:getRelatedConcepts', async (event, conceptId) => {
    logger.info('Getting related concepts', { conceptId });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'KnowledgeHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'knowledge:getRelatedConcepts',
        async () => {
          // Mock related concepts
          const relatedConcepts = [
            {
              id: 'concept_1',
              name: 'Prerequisite Concept',
              definition: 'A concept that should be learned first',
              type: 'prerequisite',
              strength: 0.9,
              difficulty: 'beginner',
              description: 'Essential foundation for the main concept'
            },
            {
              id: 'concept_2',
              name: 'Related Concept',
              definition: 'A closely related topic',
              type: 'related',
              strength: 0.8,
              difficulty: 'intermediate',
              description: 'Builds upon similar principles'
            },
            {
              id: 'concept_3',
              name: 'Advanced Application',
              definition: 'Advanced applications of the concept',
              type: 'application',
              strength: 0.7,
              difficulty: 'advanced',
              description: 'How to apply this concept in complex scenarios'
            }
          ];

          return {
            success: true,
            relatedConcepts
          };
        },
        {
          operation: 'knowledge:getRelatedConcepts',
          conceptId,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to get related concepts', error as Error, { conceptId });
      throw error;
    }
  });

  /**
   * Search knowledge graph
   */
  ipcMain.handle('knowledge:searchGraph', async (event, params) => {
    logger.info('Searching knowledge graph', {
      query: params.query,
      filters: params.filters
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'KnowledgeHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'knowledge:search',
        async () => {
          // Mock search results
          const searchResults = [
            {
              type: 'concept',
              id: 'result_1',
              title: params.query + ' Fundamentals',
              description: 'Basic concepts and principles',
              relevanceScore: 0.95,
              difficulty: 'beginner',
              category: 'Core Concepts',
              summary: 'Essential knowledge for understanding ' + params.query
            },
            {
              type: 'tutorial',
              id: 'result_2',
              title: 'Practical ' + params.query + ' Tutorial',
              description: 'Step-by-step guide with examples',
              relevanceScore: 0.88,
              difficulty: 'intermediate',
              category: 'Learning Resources',
              summary: 'Hands-on tutorial to master ' + params.query
            },
            {
              type: 'application',
              id: 'result_3',
              title: params.query + ' in Real Projects',
              description: 'Real-world applications and case studies',
              relevanceScore: 0.82,
              difficulty: 'advanced',
              category: 'Applications',
              summary: 'See how ' + params.query + ' is used in practice'
            }
          ];

          return {
            success: true,
            results: searchResults,
            totalCount: searchResults.length,
            searchMetadata: {
              query: params.query,
              searchTime: 45, // milliseconds
              filters: params.filters || {},
              categories: ['Core Concepts', 'Learning Resources', 'Applications']
            }
          };
        },
        {
          operation: 'knowledge:searchGraph',
          query: params.query,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to search knowledge graph', error as Error, params);
      throw error;
    }
  });

  /**
   * Build knowledge graph
   */
  ipcMain.handle('knowledge:buildGraph', async (event, params) => {
    logger.info('Building knowledge graph', {
      concepts: params.concepts?.length || 0,
      includeRelationships: params.includeRelationships
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'KnowledgeHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'knowledge:buildGraph',
        async () => {
          // Mock knowledge graph
          const graph = {
            id: `graph_${Date.now()}`,
            title: params.title || 'Knowledge Graph',
            nodes: [
              {
                id: 'node_1',
                label: params.concepts?.[0] || 'Core Concept',
                type: 'concept',
                difficulty: 'intermediate',
                category: 'Core',
                metadata: {
                  description: 'Main concept of the graph',
                  confidence: 0.9
                }
              },
              {
                id: 'node_2',
                label: 'Related Concept',
                type: 'concept',
                difficulty: 'beginner',
                category: 'Related',
                metadata: {
                  description: 'Related concept',
                  confidence: 0.85
                }
              }
            ],
            edges: params.includeRelationships ? [
              {
                source: 'node_1',
                target: 'node_2',
                type: 'prerequisite',
                strength: 0.8,
                label: 'requires',
                metadata: {
                  description: 'Node 2 is a prerequisite for Node 1'
                }
              }
            ] : [],
            metadata: {
              createdAt: new Date().toISOString(),
              nodeCount: 2,
              edgeCount: params.includeRelationships ? 1 : 0,
              maxDepth: 1,
              complexity: 'simple'
            },
            layout: {
              algorithm: 'force-directed',
              iterations: 100,
              spacing: 100
            }
          };

          return {
            success: true,
            graph
          };
        },
        {
          operation: 'knowledge:buildGraph',
          conceptCount: params.concepts?.length || 0,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to build knowledge graph', error as Error, params);
      throw error;
    }
  });

  /**
   * Get concept hierarchy
   */
  ipcMain.handle('knowledge:getHierarchy', async (event, params) => {
    logger.info('Getting concept hierarchy', {
      rootConcept: params.rootConcept,
      maxDepth: params.maxDepth
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'KnowledgeHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'knowledge:getHierarchy',
        async () => {
          // Mock hierarchy
          const hierarchy = {
            root: {
              id: 'root',
              name: params.rootConcept || 'Programming',
              type: 'category',
              level: 0,
              description: 'Root concept of the hierarchy'
            },
            children: [
              {
                id: 'child_1',
                name: 'Frontend Development',
                type: 'category',
                level: 1,
                description: 'Client-side programming',
                children: [
                  {
                    id: 'grandchild_1',
                    name: 'React',
                    type: 'technology',
                    level: 2,
                    description: 'JavaScript library for UI'
                  },
                  {
                    id: 'grandchild_2',
                    name: 'Vue.js',
                    type: 'technology',
                    level: 2,
                    description: 'Progressive JavaScript framework'
                  }
                ]
              },
              {
                id: 'child_2',
                name: 'Backend Development',
                type: 'category',
                level: 1,
                description: 'Server-side programming',
                children: [
                  {
                    id: 'grandchild_3',
                    name: 'Node.js',
                    type: 'technology',
                    level: 2,
                    description: 'JavaScript runtime for server'
                  }
                ]
              }
            ],
            metadata: {
              totalNodes: 6,
              maxDepth: 2,
              lastUpdated: new Date().toISOString()
            }
          };

          return {
            success: true,
            hierarchy
          };
        },
        {
          operation: 'knowledge:getHierarchy',
          rootConcept: params.rootConcept,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to get concept hierarchy', error as Error, params);
      throw error;
    }
  });

  /**
   * Parse concepts from files using AI extraction only
   * High-level interface for concept extraction from learning materials
   */
  ipcMain.handle('knowledge:parseConcepts', async (event, params) => {
    logger.info('Parsing concepts from files using AI', {
      fileCount: params.files?.length || 0,
      contentLength: params.content?.length || 0
    });

    try {
      const catalystService = getCatalystService();
      if (!catalystService) {
        throw new ServiceError(
          'Catalyst service not initialized',
          'SERVICE_NOT_INITIALIZED',
          'KnowledgeHandlers'
        );
      }

      const result = await catalystService.runWithContext(
        'system',
        'knowledge:parseConcepts',
        async () => {
          try {
            // Create config service for accessing application configuration
            const configStorage = new ElectronStoreConfigStorage('learning-catalyst-config');
            const loggerFactory = LoggerFactory.getInstance();
            const logger = loggerFactory.createContextAwareLogger();
            const configService = createConfigService(configStorage, logger);

            const appConfig = await configService.getConfig();
            if (!appConfig?.ai?.model_types?.chat) {
              throw new ServiceError(
                'AI provider not configured - please configure AI provider in settings',
                'AI_PROVIDER_NOT_CONFIGURED',
                'KnowledgeHandlers'
              );
            }

            const chatConfig = appConfig.ai.model_types.chat;

            // Initialize AI-only concept parsing pipeline
            const pipelineConfig = {
              enableAIExtraction: true,
              enableRuleExtraction: false,
              enableDeduplication: true,
              enableValidation: true,
              aiConfidenceThreshold: params.options?.confidenceThreshold || 0.6,
              maxConceptsPerDocument: params.options?.maxConceptsPerFile || 50,
              enableParallelProcessing: true,
              maxConcurrency: 3,
              timeout: 300000
            };

            const providerInfo = {
              type: chatConfig.provider,
              model: chatConfig.model
            };

            // Create LangChain adapter for AI extraction
            // Note: LangChainProviderAdapter expects an AIProvider instance, not a config object
            // For now, we'll create a minimal adapter that satisfies the interface

            // Create a mock AIProvider that satisfies the interface requirements
            const mockProvider = {
              name: providerInfo.type || 'unknown',
              type: providerInfo.type || 'unknown',
              initialized: true,
              config: {
                name: providerInfo.type || 'unknown',
                api_key: 'mock-key',
                base_url: 'https://mock-api.com'
              },
              initialize: async (config: any) => { /* Mock initialization */ },
              sendMessage: async (messages: any[], options?: any) => {
                // This should be implemented to actually call the AI provider
                // For now, return a mock response
                return {
                  content: 'Mock AI response for concept parsing',
                  model: providerInfo.model || 'unknown',
                  provider: providerInfo.type || 'unknown',
                  timestamp: new Date(),
                  usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
                };
              },
              listModels: async () => ({ chat: [], embedding: [], rerank: [] }),
              validateConfig: async (config: any) => true,
              supportsStreaming: () => false,
              supportsThinking: () => false,
              supportsTools: () => false
            };

            const adapter = new LangChainProviderAdapter(
              mockProvider,
              providerInfo.type || 'unknown',
              providerInfo.model || 'unknown',
              {
                temperature: chatConfig.temperature || 0.7,
                maxTokens: chatConfig.max_tokens || 2000
              }
            );

            const pipeline = new ConceptProcessingPipeline([adapter], pipelineConfig);
            logger.info('Concept parsing pipeline initialized with AI provider', {
              provider: providerInfo.type,
              model: providerInfo.model
            });

            // Process files or content
            const allConcepts: any[] = [];
            const allRelationships: any[] = [];
            const allErrors: string[] = [];
            let totalProcessingTime = 0;

            if (params.files && params.files.length > 0) {
              // Process multiple files
              for (const file of params.files) {
                try {
                  const result = await pipeline.processContent({
                    materialId: file.materialId || `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                    title: file.title || file.fileName,
                    content: file.content,
                    filePath: file.filePath,
                    format: 'markdown'
                  });

                  if (result.success) {
                    allConcepts.push(...result.concepts);
                    allRelationships.push(...result.relationships);
                    totalProcessingTime += result.processingTime;
                  } else {
                    allErrors.push(...result.errors.map(e => e.message));
                  }
                } catch (error) {
                  allErrors.push(`Failed to process file ${file.fileName}: ${(error as Error).message}`);
                }
              }
            } else if (params.content) {
              // Process single content
              try {
                const result = await pipeline.processContent({
                  materialId: params.materialId || `content_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                  title: params.title || 'Content Analysis',
                  content: params.content,
                  format: params.format || 'markdown'
                });

                if (result.success) {
                  allConcepts.push(...result.concepts);
                  allRelationships.push(...result.relationships);
                  totalProcessingTime = result.processingTime;
                } else {
                  allErrors.push(...result.errors.map(e => e.message));
                }
              } catch (error) {
                allErrors.push(`Failed to process content: ${(error as Error).message}`);
              }
            } else {
              throw new ServiceError(
                'No files or content provided for concept parsing',
                'INVALID_INPUT',
                'KnowledgeHandlers'
              );
            }

            // Remove duplicate concepts (by name)
            const uniqueConcepts = Array.from(
              new Map(allConcepts.map(c => [c.name.toLowerCase(), c])).values()
            );

            // Generate statistics
            const statistics = {
              totalConcepts: allConcepts.length,
              validConcepts: uniqueConcepts.length,
              totalRelationships: allRelationships.length,
              confidenceDistribution: uniqueConcepts.reduce((acc: any, concept: any) => {
                const range = concept.confidence >= 0.8 ? 'high' : concept.confidence >= 0.6 ? 'medium' : 'low';
                acc[range] = (acc[range] || 0) + 1;
                return acc;
              }, {}),
              difficultyDistribution: uniqueConcepts.reduce((acc: any, concept: any) => {
                acc[concept.difficulty] = (acc[concept.difficulty] || 0) + 1;
                return acc;
              }, {}),
              typeDistribution: uniqueConcepts.reduce((acc: any, concept: any) => {
                acc[concept.type] = (acc[concept.type] || 0) + 1;
                return acc;
              }, {}),
              processingTime: totalProcessingTime,
              modelUsage: { 'AI': allConcepts.length }
            };

            return {
              success: true,
              concepts: uniqueConcepts,
              relationships: allRelationships,
              statistics,
              errors: allErrors,
              metadata: {
                processingTime: totalProcessingTime,
                processedAt: new Date().toISOString(),
                inputFiles: params.files?.length || 0,
                aiProvider: providerInfo.type,
                aiModel: providerInfo.model
              }
            };

          } catch (error) {
            logger.error('Concept parsing pipeline failed', error as Error);
            throw new ServiceError(
              `Concept parsing failed: ${(error as Error).message}`,
              'PARSING_FAILED',
              'KnowledgeHandlers',
              undefined,
              error as Error
            );
          }
        },
        {
          operation: 'knowledge:parseConcepts',
          fileCount: params.files?.length || 0,
          source: 'ipc_handler'
        }
      );

      return result;

    } catch (error) {
      logger.error('Failed to parse concepts', error as Error, params);
      throw error;
    }
  });

  logger.info('✅ Knowledge handlers registered successfully');
}