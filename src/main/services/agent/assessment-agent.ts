import { z } from 'zod';
import type { AgentToolDeps } from './tool-registry';
import { buildAssessmentTools } from './tool-registry';
import {
  createSpecializedAgent,
  SpecializedAgentRequest,
  SpecializedAgentResult,
} from './specialized-agent';

const LevelSchema = z.enum(['novice', 'intermediate', 'advanced']);

export const AssessmentInputSchema = z
  .object({
    goal: z
      .string()
      .min(1)
      .describe('Session outcome the learner wants; assume mastery if verb is missing.'),
    concepts: z
      .array(
        z.object({
          id: z.string().describe('Stable concept id.'),
          name: z.string().describe('Readable concept name.'),
          critical: z
            .boolean()
            .optional()
            .describe('True if this concept must be solid; low score forces level down.'),
        }),
      )
      .min(1)
      .describe('Concepts to assess in this session.'),
    priorLevel: LevelSchema.optional().describe('Optional hint; agent may override or return unknown.'),
  })
  .describe('Supervisor supplies only goal + concepts (+optional priorLevel). The agent must gather evidence with its tools.');

const ConfidenceLabelSchema = z.enum(['low', 'med', 'high']);

export const AssessmentOutputSchema = z.object({
  profile: z.object({
    level: z.union([LevelSchema, z.literal('unknown')]).describe('Inferred learner level.'),
    strengths: z.array(z.string()).describe('What the learner does well.'),
    weaknesses: z.array(z.string()).describe('Observed gaps.'),
    recommendations: z.array(z.string()).describe('1–3 concrete next actions.'),
  }),
  conceptConfidences: z.array(
    z.object({
      conceptId: z.string(),
      label: ConfidenceLabelSchema,
      score: z.number().min(0).max(1),
      reasons: z.array(z.string()),
    }),
  ),
  gaps: z.array(
    z.object({
      conceptId: z.string(),
      reason: z.string(),
      suggestedPracticeHint: z.string(),
    }),
  ),
  summary: z.string().describe('2–4 sentences, plain words.'),
  nextSteps: z.array(
    z.object({
      conceptId: z.string().optional(),
      action: z.enum(['assign_practice', 'review', 're_teach']),
      rationale: z.string(),
    }),
  ),
  evidenceUsed: z.array(z.string()).describe('Short refs to practice/discussion items considered.'),
});

export type AssessmentInput = z.infer<typeof AssessmentInputSchema>;
export type AssessmentOutput = z.infer<typeof AssessmentOutputSchema>;

const SYSTEM_PROMPT = `
You are the ASSESSMENT agent. Judge understanding of the given concepts using evidence, not self‑reports.

What you get from the supervisor: goal, concepts [{id,name,critical?}], optional priorLevel.
What you must do:
- If goal or concepts are missing, ask the supervisor to provide them and STOP.
- Call tools to gather evidence: fetch_practice_history, fetch_goal_artifacts, fetch_discussion_transcript.
- Use grade_open_answer only when you need a quick score for a free‑form answer already given.
- Never invent new questions or practices. Only use returned evidence.
- Score each concept 0..1 from practice/discussion. Map to labels: <0.4 low, 0.4–0.7 med, >0.7 high.
- Level: any critical with low => novice; all high => advanced; mixed => intermediate; thin evidence => "unknown" + say what to collect.
- Output VALID JSON ONLY (no markdown fences) matching AssessmentOutputSchema: profile, conceptConfidences, gaps, summary, nextSteps, evidenceUsed.
- If evidence is thin, still return JSON with level "unknown" and recommendations describing what evidence is needed.

Flow (keep it short):
1) Gather evidence with tools.
2) Aggregate per concept.
3) Score -> labels -> level.
4) Return the JSON report.
`.trim();

export const createAssessmentAgent = (deps: AgentToolDeps) =>
  createSpecializedAgent(deps, {
    agentType: 'assessment',
    systemPrompt: SYSTEM_PROMPT,
    toolBuilder: buildAssessmentTools,
  });

export type AssessmentAgent = Awaited<ReturnType<typeof createAssessmentAgent>>;
export type AssessmentAgentRequest = SpecializedAgentRequest;
export type AssessmentAgentResult = SpecializedAgentResult;
