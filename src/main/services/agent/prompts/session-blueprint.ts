import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';

/**
 * Single-session learning blueprint schema (single source of truth for formatter and validation)
 */
export const LearnerLevelSchema = z.enum(['novice', 'intermediate', 'advanced']);

export const PracticeBlockSchema = z.object({
  type: z.enum(['retrieval', 'apply', 'teach_back', 'open_question']),
  prompt: z.string(),
  minutes: z.number().int().positive(),
  expectedAnswer: z.string().optional(),
  scoring: z.enum(['auto', 'manual', 'hybrid']),
});

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
export const formatInstructions = rawFormatInstructions
  .replace(/Include the enclosing markdown codeblock:[\s\S]*?```/g, '')
  .replace(/```json[\s\S]*?```/g, '')
  .replace(/```/g, '')
  .trim();

export const SESSION_BLUEPRINT_TEMPLATE = ChatPromptTemplate.fromMessages([
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

export const createSessionBlueprintChain = (llm: ChatOpenAI) => {
  const chain = SESSION_BLUEPRINT_TEMPLATE.pipe(llm).pipe(parser);
  return {
    rawChain: chain,
    async invoke(input: { plan_payload: string }) {
      return chain.invoke({
        ...input,
        format_instructions: formatInstructions,
      });
    },
  };
};
