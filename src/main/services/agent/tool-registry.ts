import { tool, type Tool } from 'langchain';
import type { AIService } from '@/main/services/ai/ai-service';
import type { LoggerService } from '@/main/services/core/logger/logger-service';
import type { ConceptParsingService } from '@/main/services/domain/concept-parsing/concept-parsing-service';
import type { LearningService } from '@/main/services/domain/learning/learning-service';
import type { ConfigService } from '@/main/services/core/config/config-service';
import type { ProviderFactory } from '@/main/services/agent/provider-factory';
import {
  fetchPracticeHistoryTool,
  fetchDiscussionTranscriptTool,
  fetchGoalArtifactsTool,
  gradeOpenAnswerTool,
  knowledgeExtractionTool,
  contentAnalysisTool,
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

type ContentAnalysisInput = {
  content?: string;
  analysisType?: 'summary' | 'keypoints' | 'structure' | 'complexity';
  userId?: string;
};

type PracticeHistoryInput = {
  conceptIds?: string[];
  since?: string;
};

type DiscussionTranscriptInput = {
  conceptIds?: string[];
  limit?: number;
};

type GoalArtifactsInput = {
  goal?: string;
};

type GradeOpenAnswerInput = {
  question?: string;
  answer?: string;
  rubric?: { points?: string[] };
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

      const data = result.data as {
        concepts?: Array<{ name?: string }>;
        relationships?: Array<unknown>;
        metadata?: unknown;
      };
      const nodes =
        data?.concepts?.slice(0, 5).map((concept) => concept.name ?? 'unknown') ?? [];
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

      const analysisData = result.data as {
        analysisType?: string;
        analysis?: string;
      };

      return `Analysis (${analysisData?.analysisType}): ${analysisData?.analysis || 'No analysis available'}`;
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

  return {
    ...baseTools,
  };
};

export const buildTutoringTools = (deps: AgentToolDeps): ToolRegistry => ({
  ...buildLearningTools(deps),
});

export const buildAssessmentTools = (deps: AgentToolDeps): ToolRegistry => {
  const practiceHistoryBuilder = fetchPracticeHistoryTool(deps);
  const discussionTranscriptBuilder = fetchDiscussionTranscriptTool(deps);
  const goalArtifactsBuilder = fetchGoalArtifactsTool(deps);
  const gradeOpenAnswerBuilder = gradeOpenAnswerTool(deps);

  const fetchPracticeHistory = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<PracticeHistoryInput>(rawInput, {
        conceptIds: [],
        since: undefined,
      });

      const result = await practiceHistoryBuilder({
        conceptIds: payload.conceptIds ?? [],
        since: payload.since,
      });

      if (!result.success) {
        return `fetch_practice_history failed: ${result.error}`;
      }

      return JSON.stringify(result.data);
    },
    {
      name: 'fetch_practice_history',
      description:
        'Pull recent practice attempts for the given conceptIds (pass/fail/partial, answers, errorTags, rubricScores). Use first to gather evidence before scoring understanding.',
    },
  );

  const fetchDiscussionTranscript = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<DiscussionTranscriptInput>(rawInput, {
        conceptIds: undefined,
        limit: undefined,
      });

      const result = await discussionTranscriptBuilder({
        conceptIds: payload.conceptIds,
        limit: payload.limit,
      });

      if (!result.success) {
        return `fetch_discussion_transcript failed: ${result.error}`;
      }

      return JSON.stringify(result.data);
    },
    {
      name: 'fetch_discussion_transcript',
      description:
        'Retrieve learner explanations/discussion turns related to conceptIds; useful to judge quality of reasoning and misconceptions.',
    },
  );

  const fetchGoalArtifacts = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<GoalArtifactsInput>(rawInput, {
        goal: undefined,
      });

      const result = await goalArtifactsBuilder({
        goal: payload.goal ?? rawInput,
      });

      if (!result.success) {
        return `fetch_goal_artifacts failed: ${result.error}`;
      }

      return JSON.stringify(result.data);
    },
    {
      name: 'fetch_goal_artifacts',
      description:
        'Collect artifacts the learner produced toward the goal (code/text/quiz). Use to see applied understanding.',
    },
  );

  const gradeOpenAnswer = tool(
    async (rawInput: string) => {
      const payload = parseJsonInput<GradeOpenAnswerInput>(rawInput, {
        question: undefined,
        answer: undefined,
        rubric: { points: [] },
      });

      const result = await gradeOpenAnswerBuilder({
        question: payload.question ?? '',
        answer: payload.answer ?? '',
        rubric: { points: payload.rubric?.points ?? [] },
      });

      if (!result.success) {
        return `grade_open_answer failed: ${result.error}`;
      }

      return JSON.stringify(result.data);
    },
    {
      name: 'grade_open_answer',
      description:
        'Lightweight grading for free-form answers using rubric points; returns score 0-1, errorTags, and a short note.',
    },
  );

  return {
    fetch_practice_history: fetchPracticeHistory,
    fetch_discussion_transcript: fetchDiscussionTranscript,
    fetch_goal_artifacts: fetchGoalArtifacts,
    grade_open_answer: gradeOpenAnswer,
  };
};

// buildPracticeTools - REMOVED (was only used by practice agent which has been migrated to workflow node)
