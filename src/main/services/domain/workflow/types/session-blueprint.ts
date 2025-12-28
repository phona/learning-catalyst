import { z } from 'zod';

// Learner level enum
export const LearnerLevelSchema = z.enum(['novice', 'intermediate', 'advanced']);
export type LearnerLevel = z.infer<typeof LearnerLevelSchema>;

// Practice block schema
export const PracticeBlockSchema = z.object({
  type: z.enum(['retrieval', 'apply', 'teach_back', 'open_question']),
  prompt: z.string(),
  minutes: z.number().int().positive(),
  expectedAnswer: z
    .string()
    .default('')
    .describe('Expected answer or understanding criteria to check user comprehension'),
  scoring: z.enum(['auto', 'manual', 'hybrid']),
});
export type PracticeBlock = z.infer<typeof PracticeBlockSchema>;

// Main session blueprint schema
export const SessionBlueprintSchema = z
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
    const requiredTypes = ['retrieval', 'apply', 'teach_back', 'open_question'] as const;
    const present = new Set(value.session.practiceBlocks.map((block) => block.type));
    for (const practiceType of requiredTypes) {
      if (!present.has(practiceType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `practiceBlocks must include at least one "${practiceType}" block`,
          path: ['session', 'practiceBlocks'],
        });
      }
    }
    const totalMinutes = value.session.practiceBlocks.reduce((sum, block) => sum + block.minutes, 0);
    if (totalMinutes > value.learnerProfile.timeAvailable) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total practice minutes exceed timeAvailable',
        path: ['session', 'practiceBlocks'],
      });
    }
  });

export type SessionBlueprint = z.infer<typeof SessionBlueprintSchema>;
