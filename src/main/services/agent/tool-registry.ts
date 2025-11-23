import { tool, type Tool } from 'langchain';
import type { AIService } from '@/main/services/ai/ai-service';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import type { ConceptParsingService } from '@/main/services/domain/concept-parsing/concept-parsing-service';
import type { LearningService } from '@/main/services/domain/learning/learning-service';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import {
  assessmentTool,
  knowledgeExtractionTool,
  learningPathTool,
  contentAnalysisTool,
  conceptMappingTool,
} from './tools';

const parseJsonInput = <T extends Record<string, unknown>>(raw: string, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...fallback, ...(parsed as T) } as T;
    }
  } catch {
    if ('content' in fallback) {
      return { ...fallback, content: raw } as T;
    }
  }

  return fallback;
};

type KnowledgeInput = {
  content?: string;
  userId?: string;
  context?: Record<string, unknown>;
};

type LearningPathInput = {
  action?: 'recommend' | 'create' | 'update' | 'get';
  userId?: string;
  context?: Record<string, unknown>;
  topic?: string;
};

type SearchInput = {
  query?: string;
};

type AssessmentInput = {
  action?: 'create' | 'evaluate' | 'feedback';
  type?: 'quiz' | 'exercise' | 'open_response' | 'coding';
  content?: string;
  answer?: string;
};

type ContentAnalysisInput = {
  content?: string;
  analysisType?: 'summary' | 'keypoints' | 'structure' | 'complexity';
  userId?: string;
};

export type ToolRegistry = Record<string, Tool<string>>;

export interface AgentToolDeps {
  aiService: AIService;
  conceptParsingService: ConceptParsingService;
  learningService: LearningService;
  loggerService: LoggerService;
  configService: ConfigService;
  providerFactory: ProviderFactory;
}

export const buildKnowledgeTools = (deps: AgentToolDeps): ToolRegistry => {
  const extractor = knowledgeExtractionTool(deps);
  const analyzer = contentAnalysisTool(deps);

  const knowledgeExtraction = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<KnowledgeInput>(rawInput, {
        content: rawInput,
        userId: undefined,
        context: {},
      });

      const result = await extractor({
        content: payload.content ?? '',
        userId: payload.userId,
        context: payload.context,
      });

      if (!result.success) {
        return `Knowledge extraction failed: ${result.error}`;
      }

      const data = result.data;
      const nodes =
        data?.concepts?.slice(0, 5).map((concept: any) => concept.name ?? 'unknown') ?? [];
      return JSON.stringify({
        summary: nodes.length ? `Key concepts: ${nodes.join(', ')}` : 'No concepts detected',
        nodes,
        relationships: data?.relationships?.length ?? 0,
        extractionMetadata: data?.metadata,
      });
    },
    {
      name: 'knowledge_extraction',
      description:
        'Summarize key concepts and relationships from user text, returning top concepts, their relationships, and metadata so other agents can quickly reuse these highlights.',
    },
  );

  const contentAnalysis = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<ContentAnalysisInput>(rawInput, {
        content: rawInput,
        analysisType: 'summary',
        userId: undefined,
      });

      const result = await analyzer({
        content: payload.content ?? '',
        analysisType: payload.analysisType ?? 'summary',
        userId: payload.userId,
      });

      if (!result.success) {
        return `Content analysis failed: ${result.error}`;
      }

      return `Analysis (${result.data?.analysisType}): ${result.data?.analysis || 'No analysis available'}`;
    },
    {
      name: 'content_analysis',
      description:
        'Analyze the provided text via heuristics and the content analysis service, reporting summary, key points, structural breakdown, or complexity so downstream agents can adjust tutoring or practice suggestions.',
    },
  );

  return {
    knowledgeExtraction,
    contentAnalysis,
  };
};

export const buildLearningTools = (deps: AgentToolDeps): ToolRegistry => {
  const baseTools = buildKnowledgeTools(deps);
  const pathBuilder = learningPathTool(deps);

  const learningPath = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<LearningPathInput>(rawInput, {
        action: 'recommend',
        userId: 'anonymous',
        context: {},
        topic: undefined,
      });

      const result = await pathBuilder({
        action: payload.action ?? 'recommend',
        userId: payload.userId ?? 'anonymous',
        context: payload.context,
        title: payload.topic,
        description: payload.topic,
        modules: [],
      });

      if (!result.success) {
        return `Learning path operation failed: ${result.error}`;
      }

      const data = result.data;
      const paths = (Array.isArray(data) ? data : [data]).filter(Boolean);
      const summary = paths.length
        ? paths.map((path: any) => `• ${path.title ?? 'untitled path'}`).join('\n')
        : 'No learning paths available right now.';

      return `${payload.topic ? `Paths for ${payload.topic}:\n` : ''}${summary}`;
    },
    {
      name: 'learning_path',
      description:
        'Recommend, create, fetch, or update learning paths by adjusting modules, pacing, and sequencing to align with a learner’s goals, including contextual topic signals.',
    },
  );

  return {
    ...baseTools,
    learningPath,
  };
};

export const buildTutoringTools = (deps: AgentToolDeps): ToolRegistry => ({
  ...buildLearningTools(deps),
});

export const buildAssessmentTools = (deps: AgentToolDeps): ToolRegistry => {
  const baseTools = buildKnowledgeTools(deps);
  const assessor = assessmentTool(deps);

  const assessment = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<AssessmentInput>(rawInput, {
        action: 'feedback',
        type: 'open_response',
        content: rawInput,
      });
      const result = await assessor({
        action: payload.action ?? 'feedback',
        type: payload.type ?? 'open_response',
        content: payload.content ?? '',
        answer: payload.answer,
      });

      if (!result.success) {
        return `Assessment operation failed: ${result.error}`;
      }

      return JSON.stringify({
        action: result.data?.action,
        type: result.data?.type,
        feedback: result.data?.feedback,
        summary: result.data?.content,
      });
    },
    {
      name: 'assessment_helper',
      description:
        'Support creation, evaluation, and feedback of assessments (quizzes, coding tasks, open responses) by leveraging the assessment tool’s scoring logic and returning structured observations.',
    },
  );

  return {
    ...baseTools,
    assessment,
  };
};

export const buildPracticeTools = (deps: AgentToolDeps): ToolRegistry => {
  const learningTools = buildLearningTools(deps);
  const assessmentTools = buildAssessmentTools(deps);

  return {
    ...learningTools,
    ...assessmentTools,
  };
};
