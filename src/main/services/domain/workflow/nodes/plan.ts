/**
 * Workflow Node: PLAN (Learning Plan Generator)
 *
 * Mermaid Mapping (Line 20): "Orchestrator: Update Learning Plan (Gap-Focused)"
 * Part of Path A: Fast Track Assessment
 *
 * Flow Context:
 * - Triggered after: CheckMastery (Orchestrator: Mastery > 90%?) - when "No"
 * - Triggers: StandardStart (Orchestrator: Start Topic (Gap-Aware))
 *
 * Purpose:
 * Generates a personalized learning plan based on assessment results by:
 * 1. Analyzing assessment confidence and identified gaps
 * 2. Determining learner level (novice/intermediate/advanced)
 * 3. Creating a structured session blueprint with practice blocks
 * 4. Including retrieval, application, teach-back, and open questions
 * 5. Fitting activities within time constraints
 *
 * Gap-Focused Planning:
 * - Uses gaps identified during assess phase
 * - Targets specific weaknesses in understanding
 * - Adapts difficulty to learner level
 * - Incorporates strengths to build confidence
 *
 * Flow Progression:
 * 1. DiagAssess → PresentDiag → WaitDiag → Grade
 * 2. CheckMastery → No
 * 3. PlanUpdate (this node) → StandardStart
 * 4. StandardStart begins Path B: Standard Learning Loop
 *
 * Session Blueprint Structure:
 * - learnerProfile: topic, level, strengths, gaps, timeAvailable
 * - goal: userGoal and success criteria
 * - session: primary concept, practice blocks, checks
 * - tacticsApplied: retrieval, feynman technique, spaced repetition
 *
 * Outputs:
 * - messages: Assistant message describing the plan
 * - sessionBlueprint: Structured learning plan with all blocks
 * - topic: Current learning topic
 *
 * Practice Block Types (required):
 * 1. Retrieval: Testing memory and recall
 * 2. Apply: Applying concepts to new situations
 * 3. Teach-back: Explaining concepts (Feynman technique)
 * 4. Open_question: Reflective, open-ended questions
 *
 * Note:
 * This is the "plan" in "study → assess → review" loop
 * Translates assessment data into actionable learning path
 * Bridges Fast Track discovery with Standard Learning execution
 */

import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';

/**
 * Single-session learning blueprint schemas
 */
const LearnerLevelSchema = z.enum(['novice', 'intermediate', 'advanced']);

const PracticeBlockSchema = z.object({
  type: z.enum(['retrieval', 'apply', 'teach_back', 'open_question']),
  prompt: z.string(),
  minutes: z.number().int().positive(),
  expectedAnswer: z.string().optional(),
  scoring: z.enum(['auto', 'manual', 'hybrid']),
});

const SessionBlueprintSchema = z
  .object({
    learnerProfile: z.object({
      topic: z.string(),
      level: LearnerLevelSchema,
      strengths: z.array(z.string()).optional(),
      gaps: z.array(z.string()).optional(),
      timeAvailable: z.number().int().positive(),
      constraints: z.array(z.string()).optional(),
    }),
    goal: z.object({
      userGoal: z.string(),
      successCriteria: z.array(z.string()).min(1).max(3),
    }),
    session: z.object({
      primaryConcept: z.string(),
      adjacentConcepts: z.array(z.string()).optional(),
      practiceBlocks: z.array(PracticeBlockSchema).min(4),
      checks: z.object({
        targetRetrievalScore: z.number().min(50).max(100).default(80),
      }),
    }),
    tacticsApplied: z.object({
      retrieval: z.literal(true),
      feynmanTeachBack: z.literal(true),
      spaced: z.literal(false),
    }),
    outcome: z
      .object({
        retrievalScore: z.number().min(0).max(100),
        applyPass: z.boolean(),
        teachBackPass: z.boolean(),
        openAnswerQuality: z.number().int().min(0).max(2),
        confidenceLevel: z.enum(['low', 'med', 'high']),
        done: z.boolean(),
        nextStep: z.enum(['advance', 'reinforce', 'repeat']),
      })
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const requiredTypes = ['retrieval', 'apply', 'teach_back', 'open_question'];
    const present = new Set(value.session.practiceBlocks.map((b) => b.type));
    for (const t of requiredTypes) {
      if (!present.has(t)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `practiceBlocks must include at least one "${t}" block`,
          path: ['session', 'practiceBlocks'],
        });
      }
    }
    const totalMinutes = value.session.practiceBlocks.reduce((sum, b) => sum + b.minutes, 0);
    if (totalMinutes > value.learnerProfile.timeAvailable) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total practice minutes exceed timeAvailable',
        path: ['session', 'practiceBlocks'],
      });
    }
  });

export type SessionBlueprint = z.infer<typeof SessionBlueprintSchema>;
export type LearnerLevel = z.infer<typeof LearnerLevelSchema>;
export type PracticeBlock = z.infer<typeof PracticeBlockSchema>;

// Re-export for backward compatibility with tools
export { PracticeBlockSchema, SessionBlueprintSchema };

const ROLE_DEFINITION = `
You are a focused learning designer for a SINGLE session (one sitting, 45–90 minutes).
You must keep one primary concept, include retrieval + apply + teach-back + one open question,
and fit everything inside the learner's available minutes. No multi-day plans.
`;

const EXTRACTION_RULES = `
RULES:
1. OUTPUT ONLY VALID JSON - NO OTHER TEXT, EXPLANATIONS, OR MARKDOWN
2. NEVER USE CODE BLOCKS (NO \`\`\` OR "\`\`\`json")
3. ALWAYS USE DOUBLE QUOTES FOR STRINGS AND KEYS
`;

const parser = StructuredOutputParser.fromZodSchema(SessionBlueprintSchema);
const rawFormatInstructions = parser.getFormatInstructions();
const formatInstructions = rawFormatInstructions
  .replace(/Include the enclosing markdown codeblock:[\s\S]*?```/g, '')
  .replace(/```json[\s\S]*?```/g, '')
  .replace(/```/g, '')
  .trim();

const SESSION_BLUEPRINT_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `${ROLE_DEFINITION}

${EXTRACTION_RULES}

OUTPUT FORMAT:
{format_instructions}`,
  ],
  [
    'user',
    `Build a one-session plan for this learner:
{plan_payload}`,
  ],
]);

const buildPlanPayload = (params: {
  topic: string;
  level: LearnerLevel;
  strengths?: string[];
  gaps?: string[];
  timeAvailable: number;
  constraints?: string[];
  allowExternal?: boolean;
  userGoal?: string;
}) => {
  const {
    topic,
    level,
    strengths = [],
    gaps = [],
    timeAvailable,
    constraints = [],
    allowExternal = true,
    userGoal,
  } = params;

  const goalText = userGoal || `Master the core concepts of ${topic} at a ${level} level`;

  return `
Topic: ${topic}
Learner Level: ${level}
Time Available: ${timeAvailable} minutes
User Goal: ${goalText}

Strengths to leverage: ${strengths.join(', ') || 'None specified'}
Gaps to address: ${gaps.join(', ') || 'None specified'}
Constraints: ${constraints.join(', ') || 'None specified'}
External Resources Allowed: ${allowExternal ? 'Yes' : 'No'}
`;
};

/**
 * Plan Node - Generates session blueprint based on assessment results
 */
export const planNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  // Determine learner level based on assessment confidence
  const confidence = state.confidence ?? 0.5;
  const level: LearnerLevel = confidence >= 0.8 ? 'advanced' : confidence >= 0.5 ? 'intermediate' : 'novice';

  // Use assessment results to inform the plan
  const sessionParams = {
    topic: state.topic || 'Learning Session',
    level,
    strengths: [], // Could extract from positive signals in assessment
    gaps: state.gaps ?? [], // From assessment
    timeAvailable: 60,
    constraints: [],
    allowExternal: true,
    userGoal: undefined,
  };

  // Create LLM instance using provider factory
  const { model: llm } = await deps.providerFactory.getModel('chat');

  // Create and invoke chain
  const chain = SESSION_BLUEPRINT_TEMPLATE.pipe(llm).pipe(parser);
  const result = await chain.invoke({
    plan_payload: buildPlanPayload(sessionParams),
    format_instructions: formatInstructions,
  });

  // Validate result
  const parsed = SessionBlueprintSchema.safeParse(result);
  if (!parsed.success) {
    deps.loggerService.warn('Session blueprint schema validation failed', {
      issues: parsed.error.issues,
    });
    throw new Error('Failed to generate valid session blueprint');
  }

  const blueprint = parsed.data;

  // Return state updates
  return {
    messages: [
      {
        role: 'assistant',
        content: `Based on your assessment (${Math.round(confidence * 100)}% confidence), I've created a personalized learning plan for "${blueprint.learnerProfile.topic}". The session will focus on ${blueprint.session.primaryConcept} with ${blueprint.session.practiceBlocks.length} practice activities.`,
      },
    ],
    sessionBlueprint: blueprint,
    topic: sessionParams.topic,
  };
};
