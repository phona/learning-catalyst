import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { ILogger } from '../../types';
import type { ChatMessage } from '../../ai/ai-types';
import { createStructuredJsonRunner } from '../shared/structured-json-runner';
import type { LearningSessionRow } from '@/shared/types/database';
import type { Database as CoreDatabase } from '@/main/services/core/database/kysely-schema';
import type { AiService } from '@/main/services/ai/ai-service';
import type { DomainAgent } from '@/main/services/agent/domain-agent';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  userId: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  progress: number;
  modules: LearningModule[];
  metadata?: Record<string, unknown>;
}

interface LearningModule {
  id: string;
  title: string;
  description: string;
  order: number;
  type: 'lesson' | 'quiz' | 'exercise' | 'assessment';
  content: string;
  completed: boolean;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

interface UserProgress {
  userId: string;
  currentPathId?: string;
  completedPaths: string[];
  currentModuleId?: string;
  progressPercentage: number;
  lastActiveAt: string;
  metadata?: Record<string, unknown>;
}

interface LearningSession {
  id: string;
  topic: string;
  goals: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  agentType: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'completed';
  progress: number;
  duration: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface SessionFilters {
  status?: string;
  difficulty?: string;
  agentType?: string;
  limit?: number;
}

interface SessionBlueprint {
  summary: string;
  timeline: string[];
  modules: Array<{
    title: string;
    type: LearningModule['type'];
    focus: string;
    durationMinutes: number;
    objectives: string[];
    resources: string[];
  }>;
  recommendations: string[];
}
type LearningSessionMetadata = {
  goals?: string[];
  agentType?: string;
  topic?: string;
  difficulty?: LearningSession['difficulty'];
  learningStyle?: LearningSession['learningStyle'];
  status?: LearningSession['status'];
  progress?: number;
  blueprint?: SessionBlueprint;
  recommendations?: string[];
  timeline?: string[];
  userId?: string;
  pausedAt?: string;
  resumeAt?: string;
  summary?: {
    topicsCovered: string[];
    keyTakeaways: string[];
    strengths: string[];
    areasForImprovement: string[];
    nextSteps: string[];
  };
};

const PATH_PREFIX = 'learning_path:';

const difficultyToLevel = (value: string | undefined): number => {
  switch ((value ?? 'intermediate').toLowerCase()) {
  case 'beginner':
    return 1;
  case 'advanced':
    return 3;
  default:
    return 2;
  }
};

const levelToDifficulty = (value: number): 'beginner' | 'intermediate' | 'advanced' => {
  if (value <= 1) return 'beginner';
  if (value >= 3) return 'advanced';
  return 'intermediate';
};

const safeParseJson = <T>(value?: string | null, fallback: T = {} as T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapSessionRow = (row: LearningSessionRow): LearningSession => {
  const metadata = safeParseJson<LearningSessionMetadata>(row.metadata, {});
  return {
    id: row.id,
    topic: metadata.topic ?? row.title,
    goals: metadata.goals ?? [],
    difficulty: metadata.difficulty ?? levelToDifficulty(row.difficulty_level),
    agentType: metadata.agentType ?? 'learning',
    learningStyle: metadata.learningStyle ?? 'visual',
    createdAt: row.created_at,
    startedAt: row.start_time,
    updatedAt: row.updated_at,
    status: metadata.status ?? 'active',
    progress: metadata.progress ?? 0,
    duration: row.duration_seconds,
    userId: metadata.userId,
    metadata,
  };
};

const computeProgressSnapshot = (session: LearningSession, blueprint?: SessionBlueprint) => {
  const moduleCount = blueprint?.modules?.length ?? 4;
  const completedModules = Math.round((session.progress / 100) * moduleCount);
  return {
    sessionId: session.id,
    overallProgress: session.progress,
    timeSpent: Math.max(600, session.duration),
    modulesCompleted: completedModules,
    totalModules: moduleCount,
    currentModule: Math.min(moduleCount, completedModules + 1),
    conceptsLearned: Math.max(3, completedModules + 2),
    skillsAcquired: ['Concept Reinforcement', 'Applied Practice', 'Reflection'].slice(
      0,
      Math.max(1, completedModules),
    ),
    masteryLevels: {
      basic: Math.min(100, 40 + session.progress),
      intermediate: Math.min(100, 20 + session.progress),
      advanced: Math.min(100, session.progress),
    },
    achievements: [
      {
        id: 'ach_consistency',
        name: 'Consistency Builder',
        description: 'Maintained steady learning momentum',
        earnedAt: session.updatedAt,
      },
    ],
    nextActions: blueprint?.recommendations ?? [
      'Schedule a focused review',
      'Apply the concept to a personal project',
      'Capture open questions for the next session',
    ],
  };
};

const buildLearningPathFromModules = ({
  pathId,
  params,
  modules,
}: {
  pathId: string;
  params: {
    title: string;
    description: string;
    userId: string;
    metadata?: Record<string, unknown>;
  };
  modules: Array<{
    title: string;
    description: string;
    type: LearningModule['type'];
    order: number;
  }>;
}): LearningPath => {
  const now = new Date().toISOString();
  return {
    id: pathId,
    title: params.title,
    description: params.description,
    userId: params.userId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    progress: 0,
    modules: modules.map((module) => ({
      id: `module_${pathId}_${module.order}`,
      title: module.title,
      description: module.description,
      order: module.order,
      type: module.type,
      content: module.description,
      completed: false,
    })),
    metadata: params.metadata,
  };
};

export const createLearningService = ({
  db,
  loggerService,
  aiService,
  domainAgent,
}: {
  db: Kysely<CoreDatabase>;
  loggerService: { child: (meta: Record<string, unknown>) => ILogger };
  aiService: AiService;
  domainAgent: DomainAgent;
}) => {
  const serviceLogger = loggerService.child({ service: 'learning' });
  const learningModelPreset = aiService.getModelPreset('learning.plan');
  const { runStructuredJson } = createStructuredJsonRunner({
    aiService,
    domainAgent,
    logger: serviceLogger,
    modelConfig: learningModelPreset,
  });

  const ensureSessionRow = async (sessionId: string): Promise<LearningSessionRow> => {
    const row = await db
      .selectFrom('learning_sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();
    if (!row) {
      throw new Error(`Learning session ${sessionId} not found`);
    }
    return row;
  };

  const updateSessionMetadata = async (
    sessionId: string,
    updater: (metadata: LearningSessionMetadata) => LearningSessionMetadata,
    extraUpdates: Partial<LearningSessionRow> = {},
  ) => {
    const row = await ensureSessionRow(sessionId);
    const currentMetadata = safeParseJson<LearningSessionMetadata>(row.metadata, {});
    const nextMetadata = updater(currentMetadata);
    await db
      .updateTable('learning_sessions')
      .set({
        ...extraUpdates,
        metadata: JSON.stringify(nextMetadata),
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', sessionId)
      .execute();
    return nextMetadata;
  };

  const buildSessionBlueprint = async (params: {
    topic: string;
    goals: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    learningStyle: LearningSession['learningStyle'];
  }): Promise<SessionBlueprint> => {
    const fallbackModules = (params.goals.length ? params.goals : ['Understand core concept']).map(
      (goal, index) => ({
        title: `Focus ${index + 1}: ${goal}`,
        type: (index === params.goals.length - 1 ? 'assessment' : 'lesson') as
          | 'assessment'
          | 'exercise'
          | 'quiz'
          | 'lesson',
        focus: goal,
        durationMinutes: 25 + index * 10,
        objectives: [goal, 'Apply in practice', 'Reflect on learning'],
        resources: ['Review notes', 'Hands-on exercise', 'Reflection prompts'],
      }),
    );

    const fallback: SessionBlueprint = {
      summary: `Plan to explore ${params.topic} with emphasis on ${params.goals.join(', ') || 'core fundamentals'}.`,
      timeline: ['Warm-up & review', 'Deep dive', 'Practice & reflection'],
      modules: fallbackModules.slice(0, 4),
      recommendations: [
        'Capture quick wins after each module',
        'Schedule a follow-up practice session tomorrow',
      ],
    };

    const sessionDescriptor = {
      topic: params.topic,
      goals: params.goals,
      difficulty: params.difficulty,
      learningStyle: params.learningStyle,
      timestamp: new Date().toISOString(),
    };

    const systemPrompt =
      'You are an AI learning session planner. Return concise JSON with session summary, timeline, modules (title, type, focus, durationMinutes, objectives, resources), and actionable recommendations.';
    const userInput = JSON.stringify({ session: sessionDescriptor }, null, 2);

    return runStructuredJson<SessionBlueprint>({
      systemPrompt,
      input: userInput,
      fallbackPrompt: `${systemPrompt}\n${userInput}`,
      fallback,
      context: 'learning-session-blueprint',
    });
  };

  const persistLearningPath = async (path: LearningPath): Promise<LearningPath> => {
    const key = `${PATH_PREFIX}${path.id}`;
    await db.deleteFrom('settings').where('key', '=', key).execute();
    await db
      .insertInto('settings')
      .values({
        id: randomUUID(),
        key,
        value: JSON.stringify(path),
        data_type: 'json',
        description: `Learning path for ${path.userId}`,
        created_at: path.createdAt,
        updated_at: path.updatedAt,
      })
      .execute();
    return path;
  };

  const getStoredLearningPath = async (pathId: string): Promise<LearningPath | null> => {
    const row = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', `${PATH_PREFIX}${pathId}`)
      .executeTakeFirst();
    if (!row) return null;
    return safeParseJson<LearningPath>(row.value, undefined);
  };

  const listLearningPathsForUser = async (userId: string): Promise<LearningPath[]> => {
    const rows = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', 'like', `${PATH_PREFIX}%`)
      .execute();
    return rows
      .map((row) => safeParseJson<LearningPath>(row.value, undefined))
      .filter((path): path is LearningPath => Boolean(path?.userId === userId));
  };

  const generateRecommendedPaths = async (
    userId: string,
    context?: Record<string, unknown>,
  ): Promise<LearningPath[]> => {
    const fallbackPaths: LearningPath[] = [
      buildLearningPathFromModules({
        pathId: `rec_${Date.now()}_1`,
        params: {
          title: 'Strengthen Core Concepts',
          description: 'Reinforce fundamental topics before moving forward.',
          userId,
          metadata: context,
        },
        modules: [
          { title: 'Concept Review', description: 'Summarize key ideas', type: 'lesson', order: 0 },
          {
            title: 'Targeted Practice',
            description: 'Hands-on drills',
            type: 'exercise',
            order: 1,
          },
          { title: 'Reflection', description: 'Document takeaways', type: 'assessment', order: 2 },
        ],
      }),
      buildLearningPathFromModules({
        pathId: `rec_${Date.now()}_2`,
        params: {
          title: 'Project-Based Deep Dive',
          description: 'Apply concepts within a self-directed project.',
          userId,
          metadata: context,
        },
        modules: [
          { title: 'Scoping', description: 'Define project goals', type: 'lesson', order: 0 },
          { title: 'Implementation', description: 'Build iteratively', type: 'exercise', order: 1 },
          {
            title: 'Review & Feedback',
            description: 'Assess outcomes',
            type: 'assessment',
            order: 2,
          },
        ],
      }),
    ];

    const payload = JSON.stringify(
      {
        userId,
        context,
      },
      null,
      2,
    );

    const systemPrompt =
      'You are a learning strategist. Return JSON array of learning paths with title, description, rationale, modules (title, description, type).';

    const suggestions = await runStructuredJson<
      Array<{
        title: string;
        description: string;
        rationale?: string;
        modules: Array<{ title: string; description: string; type: LearningModule['type'] }>;
      }>
    >({
      systemPrompt,
      input: payload,
      fallbackPrompt: `${systemPrompt}\n${payload}`,
      fallback: fallbackPaths.map((path) => ({
        title: path.title,
        description: path.description,
        modules: path.modules.map((module) => ({
          title: module.title,
          description: module.description,
          type: module.type,
        })),
      })),
      context: 'learning-path-recommendations',
    });

    return suggestions.map((suggestion, index) =>
      buildLearningPathFromModules({
        pathId: `rec_${Date.now()}_${index}`,
        params: {
          title: suggestion.title,
          description: suggestion.description,
          userId,
          metadata: { context, rationale: suggestion.rationale },
        },
        modules: suggestion.modules.map((module, order) => ({
          ...module,
          order,
        })),
      }),
    );
  };

  return {
    createLearningPath: async (params: {
      title: string;
      description: string;
      userId: string;
      modules: Array<{
        title: string;
        description: string;
        type: LearningModule['type'];
        order: number;
      }>;
      metadata?: Record<string, unknown>;
    }): Promise<LearningPath> => {
      serviceLogger.info('Creating learning path', { title: params.title, userId: params.userId });
      const pathId = `path_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const path = buildLearningPathFromModules({
        pathId,
        params,
        modules: params.modules,
      });
      await persistLearningPath(path);
      return path;
    },

    getLearningPath: async (pathId: string): Promise<LearningPath | null> => {
      serviceLogger.info('Retrieving learning path', { pathId });
      return getStoredLearningPath(pathId);
    },

    getUserProgress: async (userId: string): Promise<UserProgress> => {
      serviceLogger.info('Aggregating user progress', { userId });
      const sessions = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .where('metadata', 'like', `%\"userId\":\"${userId}\"%`)
        .orderBy('updated_at', 'desc')
        .execute();

      const completed = sessions.filter((row) => row.metadata?.includes('"status":"completed"'));
      const current = sessions[0];

      return {
        userId,
        completedPaths: completed.map((row) => row.id),
        currentPathId: current?.id,
        currentModuleId: undefined,
        progressPercentage: sessions.length
          ? Math.round((completed.length / sessions.length) * 100)
          : 0,
        lastActiveAt: current?.updated_at ?? new Date().toISOString(),
        metadata: { totalSessions: sessions.length },
      };
    },

    getRecommendedPaths: async (userId: string, context?: Record<string, unknown>) => {
      serviceLogger.info('Generating recommended learning paths', { userId });
      const stored = await listLearningPathsForUser(userId);
      if (stored.length) {
        return stored;
      }
      return generateRecommendedPaths(userId, context);
    },

    startLearningSession: async (params: {
      topic: string;
      goals: string[];
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      agentType: string;
      learningStyle: LearningSession['learningStyle'];
      userId?: string;
    }): Promise<LearningSession> => {
      const blueprint = await buildSessionBlueprint({
        topic: params.topic,
        goals: params.goals ?? [],
        difficulty: params.difficulty ?? 'intermediate',
        learningStyle: params.learningStyle ?? 'visual',
      });

      const metadata: LearningSessionMetadata = {
        goals: params.goals ?? [],
        agentType: params.agentType,
        topic: params.topic,
        difficulty: params.difficulty ?? 'intermediate',
        learningStyle: params.learningStyle ?? 'visual',
        status: 'active',
        progress: 10,
        blueprint,
        recommendations: blueprint.recommendations,
        timeline: blueprint.timeline,
        userId: params.userId,
      };

      const now = new Date().toISOString();
      const row: LearningSessionRow = {
        id: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: params.topic,
        description: blueprint.summary,
        start_time: now,
        end_time: undefined,
        duration_seconds: 0,
        total_messages: 0,
        concepts_studied: 0,
        difficulty_level: difficultyToLevel(params.difficulty),
        session_type: 'general',
        metadata: JSON.stringify(metadata),
        created_at: now,
        updated_at: now,
      };

      await db.insertInto('learning_sessions').values(row).execute();
      serviceLogger.info('Learning session started', { sessionId: row.id });
      return mapSessionRow(row);
    },

    getSessionProgress: async (sessionId: string) => {
      const row = await ensureSessionRow(sessionId);
      const session = mapSessionRow(row);
      const blueprint = session.metadata?.blueprint;
      const snapshot = computeProgressSnapshot(
        session,
        blueprint &&
          typeof blueprint === 'object' &&
          blueprint !== null &&
          'summary' in blueprint &&
          'timeline' in blueprint &&
          'modules' in blueprint &&
          'recommendations' in blueprint
          ? (blueprint as SessionBlueprint)
          : undefined,
      );
      serviceLogger.info('Session progress calculated', { sessionId });
      return snapshot;
    },

    pauseSession: async (sessionId: string) => {
      const metadata = await updateSessionMetadata(sessionId, (current) => ({
        ...current,
        status: 'paused',
        pausedAt: new Date().toISOString(),
      }));
      serviceLogger.info('Session paused', { sessionId });
      return {
        success: true,
        resumeData: {
          sessionId,
          lastProgress: metadata.progress ?? 0,
          pausedAt: metadata.pausedAt,
        },
      };
    },

    resumeSession: async (sessionId: string) => {
      const metadata = await updateSessionMetadata(sessionId, (current) => ({
        ...current,
        status: 'active',
        resumeAt: new Date().toISOString(),
      }));
      serviceLogger.info('Session resumed', { sessionId });
      return {
        success: true,
        context: {
          sessionId,
          topic: metadata.topic,
          progress: metadata.progress ?? 0,
          resumeAt: metadata.resumeAt,
        },
      };
    },

    completeSession: async (sessionId: string) => {
      const row = await ensureSessionRow(sessionId);
      const session = mapSessionRow(row);
      const blueprint = session.metadata?.blueprint;

      const fallbackSummary = {
        summary: {
          topicsCovered: session.goals.length ? session.goals : [session.topic],
          keyTakeaways: ['Documented understanding', 'Applied concepts', 'Identified next steps'],
          strengths: ['Consistency', 'Reflection'],
          areasForImprovement: ['Deeper practice'],
          nextSteps: ['Schedule advanced session', 'Review notes tomorrow'],
        },
        performance: {
          accuracy: 0.85,
          engagement: 0.92,
          retention: 0.81,
        },
      };

      const payload = JSON.stringify(
        {
          session,
          blueprint,
        },
        null,
        2,
      );

      const summary = await runStructuredJson<typeof fallbackSummary>({
        systemPrompt:
          'You are a learning reflection coach. Return JSON { summary: { topicsCovered: string[], keyTakeaways: string[], strengths: string[], areasForImprovement: string[], nextSteps: string[] }, performance: { accuracy: number, engagement: number, retention: number } }',
        input: payload,
        fallbackPrompt: `${payload}`,
        fallback: fallbackSummary,
        context: 'learning-session-summary',
      });

      await updateSessionMetadata(
        sessionId,
        (current) => ({
          ...current,
          status: 'completed',
          progress: 100,
          summary: summary.summary,
        }),
        {
          end_time: new Date().toISOString(),
          duration_seconds: session.duration,
          updated_at: new Date().toISOString(),
        },
      );

      serviceLogger.info('Session completed', { sessionId });
      return {
        sessionId,
        title: session.topic,
        summary: summary.summary,
        performance: summary.performance,
      };
    },

    getRecentSessions: async (options?: SessionFilters) => {
      const limit = options?.limit ?? 5;
      const rows = await db
        .selectFrom('learning_sessions')
        .selectAll()
        .orderBy('updated_at', 'desc')
        .limit(limit)
        .execute();
      return rows.map(mapSessionRow);
    },

    searchSessions: async (query: string, filters?: SessionFilters) => {
      let builder = db.selectFrom('learning_sessions').selectAll();

      if (filters?.status) {
        builder = builder.where('metadata', 'like', `%\"status\":\"${filters.status}\"%`);
      }

      if (filters?.difficulty) {
        builder = builder.where('difficulty_level', '=', difficultyToLevel(filters.difficulty));
      }

      if (filters?.agentType) {
        builder = builder.where('metadata', 'like', `%\"agentType\":\"${filters.agentType}\"%`);
      }

      if (query?.trim()) {
        const like = `%${query.trim()}%`;
        builder = builder.where((eb) =>
          eb.or([
            eb('title', 'like', like),
            eb('description', 'like', like),
            eb('metadata', 'like', like),
          ]),
        );
      }

      const rows = await builder
        .orderBy('updated_at', 'desc')
        .limit(filters?.limit ?? 20)
        .execute();
      const sessions = rows.map(mapSessionRow);

      return {
        query,
        totalResults: sessions.length,
        sessions,
        appliedFilters: filters || {},
        limit: filters?.limit ?? sessions.length,
      };
    },
  };
};

export type LearningService = ReturnType<typeof createLearningService>;
