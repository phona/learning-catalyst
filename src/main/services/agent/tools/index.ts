/**
 * Agent Tools Implementation
 * Simple, clean, and maintainable tool implementations
 */

import type { AIService } from '@/main/services/ai/ai-service';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import type {
  ConceptParsingService,
  ConceptParsingMaterial,
} from '@/main/services/domain/concept-parsing/concept-parsing-service';
import type { LearningService } from '@/main/services/domain/learning/learning-service';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ToolServices, ToolResult } from './types';
import { z } from 'zod';

const safeJsonArray = (value?: string): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeJsonObject = <T extends Record<string, any>>(value?: string): T | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? (parsed as T) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Content Analysis Tool
 * Analyzes content for summary, keypoints, structure, etc.
 */
export const contentAnalysisTool = (services: ToolServices) => {
  return async (params: {
    content: string;
    analysisType: 'summary' | 'keypoints' | 'structure' | 'complexity';
    userId?: string;
  }): Promise<ToolResult> => {
    if (!params.content?.trim()) {
      return {
        success: false,
        error: 'Content is required for analysis',
      };
    }

    const logger = services.loggerService.child({ tool: 'content-analysis' });
    logger.info('Content analysis requested', {
      analysisType: params.analysisType,
      contentLength: params.content.length,
      userId: params.userId,
    });

    try {
      // Define prompts for different analysis types
      const analysisPrompts = {
        summary:
          'Create a concise summary of the provided content. Focus on the main points and key takeaways.',
        keypoints:
          'Extract the key points and main ideas from the provided content. Present them in a structured list.',
        structure:
          'Analyze the structure and organization of the provided content. Identify sections, topics, and how ideas flow.',
        complexity:
          'Analyze the complexity level of the provided content. Consider vocabulary, concepts, and required background knowledge.',
      };

      const systemPrompt = analysisPrompts[params.analysisType];

      // Get model configuration
      const configResult = await services.configService.get('ai.modelTypes.chat');
      const modelConfig =
        typeof configResult === 'object' && configResult !== null
          ? (configResult as any)
          : {
              provider: 'openai',
              model: 'gpt-4o',
              temperature: 0.4,
              maxTokens: 2048,
            };

      // Validate API key exists
      if (!modelConfig.apiKey) {
        return {
          success: false,
          error: 'API key is required for content analysis operations',
        };
      }

      const result = await services.aiService.chatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.content },
        ],
        modelConfig: {
          provider: modelConfig.provider || 'openai',
          model: modelConfig.model || 'gpt-4o',
          apiKey: modelConfig.apiKey,
          temperature: modelConfig.temperature || 0.4,
          maxTokens: modelConfig.maxTokens || 2048,
        },
      });

      return {
        success: true,
        data: {
          analysisType: params.analysisType,
          content: params.content,
          analysis: result.content,
          model: result.model,
          usage: result.usage,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Content analysis failed', { error, analysisType: params.analysisType });
      return {
        success: false,
        error: `Content analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
};

/**
 * Learning Path Tool
 * Creates, manages, and recommends learning paths
 */
export const learningPathTool = (services: ToolServices) => {
  return async (params: {
    action: 'create' | 'update' | 'get' | 'recommend';
    userId: string;
    title?: string;
    description?: string;
    modules?: Array<{ title: string; content: string; type: string }>;
    pathId?: string;
    context?: Record<string, unknown>;
  }): Promise<ToolResult> => {
    if (!params.userId) {
      return {
        success: false,
        error: 'User ID is required for learning path operations',
      };
    }

    const logger = services.loggerService.child({ tool: 'learning-path' });
    logger.info('Learning path operation requested', {
      action: params.action,
      userId: params.userId,
      pathId: params.pathId,
    });

    try {
      let result;

      switch (params.action) {
        case 'create':
          if (!params.title || !params.modules) {
            return {
              success: false,
              error: 'Title and modules are required for creating a learning path',
            };
          }

          // Validate module structure
          for (const module of params.modules) {
            if (!module.title || !module.content || !module.type) {
              return {
                success: false,
                error: 'Each module must have title, content, and type',
              };
            }
          }

          result = await services.learningService.createLearningPath({
            title: params.title,
            description: params.description || `Learning path: ${params.title}`,
            userId: params.userId,
            modules: params.modules.map((module, index) => ({
              title: module.title,
              content: module.content,
              description: module.content,
              type: module.type as 'quiz' | 'exercise' | 'lesson' | 'assessment',
              order: index,
            })),
            metadata: {
              ...params.context,
              toolVersion: '1.0.0',
              createdAt: new Date().toISOString(),
            },
          });
          break;

        case 'get':
          if (!params.pathId) {
            return {
              success: false,
              error: 'pathId is required for getting a learning path',
            };
          }
          result = await services.learningService.getLearningPath(params.pathId);
          break;

        case 'update':
          if (!params.pathId) {
            return {
              success: false,
              error: 'pathId is required for updating a learning path',
            };
          }
          if (!params.title && !params.modules && !params.description) {
            return {
              success: false,
              error: 'At least one field (title, modules, or description) is required for update',
            };
          }

          // For now, create a new path with updated data since updateLearningPath might not exist
          if (params.title && params.modules) {
            result = await services.learningService.createLearningPath({
              title: params.title,
              description: params.description || `Updated: ${params.title}`,
              userId: params.userId,
              modules: params.modules.map((module, index) => ({
                title: module.title,
                content: module.content,
                description: module.content,
                type: module.type as 'quiz' | 'exercise' | 'lesson' | 'assessment',
                order: index,
              })),
              metadata: {
                ...params.context,
                updatedAt: new Date().toISOString(),
                originalPathId: params.pathId,
              },
            });
          } else {
            result = { message: 'Update functionality needs full implementation' };
          }
          break;

        case 'recommend':
          result = await services.learningService.getRecommendedPaths(
            params.userId,
            params.context,
          );
          break;

        default:
          return {
            success: false,
            error: `Unknown action: ${params.action}`,
          };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('Learning path operation failed', { error, action: params.action });
      return {
        success: false,
        error: `Learning path ${params.action} failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
};

/**
 * Assessment evidence + grading tools
 * These are the ONLY tools the assessment agent should call.
 */
export type PracticeAttempt = {
  taskId: string;
  conceptIds: string[];
  result: 'pass' | 'fail' | 'partial';
  answer?: string;
  errorTags?: string[];
  rubricScores?: {
    retrieval?: number;
    application?: number;
    teachBack?: number;
  };
  timestamp?: string;
};

export type DiscussionTurn = {
  text: string;
  conceptIds?: string[];
  timestamp?: string;
};

export type GoalArtifact = {
  type: 'code' | 'text' | 'quiz' | 'other';
  content: string;
  conceptIds?: string[];
  timestamp?: string;
};

const requireConcepts = (conceptIds?: string[]) => {
  if (!conceptIds || conceptIds.length === 0) {
    return {
      success: false,
      error: 'conceptIds is required and cannot be empty',
    } as const;
  }
  return null;
};

export const fetchPracticeHistoryTool = (services: ToolServices) => {
  return async (params: {
    conceptIds: string[];
    since?: string;
  }): Promise<ToolResult> => {
    const validation = requireConcepts(params?.conceptIds);
    if (validation) return validation;

    const logger = services.loggerService.child({ tool: 'fetch-practice-history' });
    logger.info('Fetching practice history', {
      conceptCount: params.conceptIds.length,
      since: params.since,
    });

    try {
      const attempts = await services.learningService.getPracticeHistory({
        conceptIds: params.conceptIds,
        since: params.since,
        limit: 50,
      });

      return {
        success: true,
        data: {
          attempts,
          source: 'practice_attempts',
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `practice history retrieval failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  };
};

export const fetchDiscussionTranscriptTool = (services: ToolServices) => {
  return async (params: {
    conceptIds?: string[];
    limit?: number;
  }): Promise<ToolResult> => {
    const logger = services.loggerService.child({ tool: 'fetch-discussion-transcript' });
    logger.info('Fetching discussion transcript', {
      conceptCount: params.conceptIds?.length ?? 0,
      limit: params.limit,
    });

    try {
      const limit = Math.min(params.limit ?? 15, 50);
      const messages = await services.learningService.listMessages({
        limit,
        onlyNonEmpty: true,
        order: 'desc',
      });
      const turns: DiscussionTurn[] = messages
        .map((row) => ({ text: row.content, conceptIds: params.conceptIds, timestamp: row.timestamp }))
        .filter((t) => t.text);

      return {
        success: true,
        data: { turns, source: 'messages', fetchedAt: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        error: `discussion transcript retrieval failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  };
};

export const fetchGoalArtifactsTool = (services: ToolServices) => {
  return async (params: {
    goal: string;
  }): Promise<ToolResult> => {
    if (!params.goal?.trim()) {
      return { success: false, error: 'goal is required to fetch goal artifacts' };
    }

    const logger = services.loggerService.child({ tool: 'fetch-goal-artifacts' });
    logger.info('Fetching goal artifacts', {
      goal: params.goal.slice(0, 100),
    });

    try {
      const messages = await services.learningService.listMessages({
        limit: 20,
        onlyNonEmpty: true,
        order: 'desc',
      });
      const artifacts: GoalArtifact[] = messages
        .map((row) => {
          const isCode = /```/.test(row.content) || /function|class|const|let|var/.test(row.content);
          const type: GoalArtifact['type'] = isCode ? 'code' : 'text';
          return { type, content: row.content, conceptIds: [], timestamp: row.timestamp };
        })
        .filter((a) => a.content);

      return {
        success: true,
        data: { artifacts, source: 'messages', fetchedAt: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        error: `goal artifacts retrieval failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  };
};

export const gradeOpenAnswerTool = (services: ToolServices) => {
  return async (params: {
    question: string;
    answer: string;
    rubric: { points: string[] };
  }): Promise<ToolResult> => {
    if (!params.question?.trim()) {
      return { success: false, error: 'question is required for grading' };
    }
    if (!params.answer?.trim()) {
      return { success: false, error: 'answer is required for grading' };
    }
    if (!params.rubric?.points?.length) {
      return { success: false, error: 'rubric.points must include at least one expectation' };
    }

    const logger = services.loggerService.child({ tool: 'grade-open-answer' });
    logger.info('Grading open answer', {
      questionLength: params.question.length,
      answerLength: params.answer.length,
      rubricPoints: params.rubric.points.length,
    });

    // Lightweight heuristic: score based on keyword hits
    const normalizedAnswer = params.answer.toLowerCase();
    const hits = params.rubric.points.filter((point) =>
      normalizedAnswer.includes(point.toLowerCase()),
    ).length;
    const score = Math.min(1, Math.max(0, hits / params.rubric.points.length));

    const errorTags = score >= 0.75 ? [] : ['missing_points'];
    const note =
      score >= 0.75
        ? 'Covers most rubric points'
        : 'Answer misses some rubric points; prompt learner to add specifics';

    return {
      success: true,
      data: {
        score,
        errorTags,
        note,
        rubricPoints: params.rubric.points,
      },
    };
  };
};

/**
 * Knowledge Extraction Tool
 * Extracts and structures knowledge concepts from text content
 */
export const knowledgeExtractionTool = (services: ToolServices) => {
  return async (params: {
    content: string;
    userId?: string;
    context?: Record<string, unknown>;
    confidenceThreshold?: number;
  }): Promise<ToolResult> => {
    if (!params.content?.trim()) {
      return {
        success: false,
        error: 'Content is required for knowledge extraction',
      };
    }

    const logger = services.loggerService.child({ tool: 'knowledge-extraction' });
    logger.info('Knowledge extraction requested', {
      contentLength: params.content.length,
      userId: params.userId,
    });

    try {
      const material: ConceptParsingMaterial = {
        id: `tool-${Date.now()}`,
        title: String(params.context?.topic ?? 'tool-input'),
        content: params.content,
        format: 'markdown',
        metadata: {
          userId: params.userId,
          context: params.context,
          toolVersion: '1.0.0',
          extractionTimestamp: new Date().toISOString(),
        },
      };

      let depth: number | undefined;
      try {
        const ui = await services.configService.get('ui');
        depth = ui?.documentHeadingDepth;
      } catch {}

      const result = await services.conceptParsingService.parseMaterials([material], {
        userId: params.userId,
        maxHeadingDepth: depth,
        options: {
          confidenceThreshold: params.confidenceThreshold ?? 0.5,
        },
      });

      logger.info('Knowledge extraction completed', {
        nodeCount: result.concepts.length,
        relationshipCount: result.relationships.length,
      });

      return {
        success: true,
        data: {
          ...result,
          metadata: {
            toolVersion: '1.0.0',
            extractionTimestamp: new Date().toISOString(),
            confidenceThreshold: params.confidenceThreshold ?? 0.5,
          },
        },
      };
    } catch (error) {
      logger.error('Knowledge extraction failed', { error });
      return {
        success: false,
        error: `Knowledge extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
};

/**
 * Concept Mapping Tool (Simple stub)
 * Helps understand relationships between concepts
 */
export const conceptMappingTool = (services: ToolServices) => {
  return async (params: {
    concepts: string[];
    userId?: string;
    context?: Record<string, unknown>;
  }): Promise<ToolResult> => {
    if (!params.concepts || params.concepts.length === 0) {
      return {
        success: false,
        error: 'Concepts array is required',
      };
    }

    const logger = services.loggerService.child({ tool: 'concept-mapping' });
    logger.info('Concept mapping requested', {
      conceptCount: params.concepts.length,
      userId: params.userId,
    });

    try {
      // Simple implementation - create nodes for concepts
      const nodes = params.concepts.map((concept) => ({
        id: concept,
        title: concept,
        metadata: params.context ?? {},
        status: 'unmapped',
      }));

      return {
        success: true,
        data: {
          nodes,
          relationshipSuggestions: [],
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Concept mapping failed', { error });
      return {
        success: false,
        error: `Concept mapping failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
};

/**
 * Compute confidence from practice signals (behavioral, not self-report).
 */
export const computeConfidence = (input: {
  retrievalScore: number;
  applyPass: boolean;
  teachBackPass: boolean;
  openAnswerQuality: number; // 0-2
  hintsUsed: number;
  attempts: number;
  timeOnTarget: boolean;
  errorTags?: string[];
}): 'low' | 'med' | 'high' => {
  let score = 0;
  if (input.retrievalScore >= 85) score += 1;
  if (input.applyPass) score += 1;
  if (input.teachBackPass) score += 1;
  if (input.hintsUsed === 0 && input.attempts === 1 && input.timeOnTarget) score += 1;
  if (input.errorTags?.length) {
    score -= Math.min(input.errorTags.length, 2);
  }
  if (input.openAnswerQuality === 2) score += 1;
  if (input.openAnswerQuality === 0) score -= 1;

  if (score <= 1) return 'low';
  if (score === 2) return 'med';
  return 'high';
};

/**
 * Evaluate mastery/outcome using performance + confidence.
 */
export const evaluateOutcome = (input: {
  retrievalScore: number;
  applyPass: boolean;
  teachBackPass: boolean;
  openAnswerQuality: number; // 0-2
  confidence: 'low' | 'med' | 'high';
}) => {
  const done = input.retrievalScore >= 80 && input.applyPass && input.teachBackPass;
  if (!done) {
    return { done: false, nextStep: 'repeat' as const };
  }
  if (input.confidence === 'low' || input.confidence === 'med') {
    return { done: true, nextStep: 'reinforce' as const };
  }
  return { done: true, nextStep: 'advance' as const };
};
