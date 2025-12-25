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

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { SessionBlueprintSchema } from '../types/session-blueprint';
import type { LearnerLevel } from '../types/session-blueprint';

export { LearnerLevelSchema, PracticeBlockSchema, SessionBlueprintSchema } from '../types/session-blueprint';
export type { LearnerLevel, PracticeBlock, SessionBlueprint } from '../types/session-blueprint';

/**
 * Role definition for the learning plan generator
 */
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

// Using 'as any' cast here is a Zod best practice when working with external libraries.
// LangChain's StructuredOutputParser expects a Zod schema, but TypeScript may not recognize
// the schema type without this cast. This is recommended in the Zod official documentation
// for scenarios where Zod schemas are passed to third-party type systems.
const parser = StructuredOutputParser.fromZodSchema(SessionBlueprintSchema as any);
const formatInstructions = parser.getFormatInstructions()
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
    [
      'Build a one-session plan for this learner:',
      '',
      'Topic: {topic}',
      'Learner Level: {level}',
      'Time Available: {timeAvailable} minutes',
      'User Goal: {userGoal}',
      '',
      'Strengths to leverage: {strengths}',
      'Gaps to address: {gaps}',
      'Constraints: {constraints}',
      'External Resources Allowed: {allowExternal}',
    ].join('\n')
  ],
]);

/**
 * Plan Node - Generates session blueprint based on assessment results
 */
export const planNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  _config: LangGraphRunnableConfig
) => {
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
  const llm = await deps.providerFactory.getModel();

  // Create and invoke chain
  const chain = SESSION_BLUEPRINT_TEMPLATE.pipe(llm).pipe(parser);
  const result = await chain.invoke({
    topic: sessionParams.topic,
    level: sessionParams.level,
    timeAvailable: sessionParams.timeAvailable,
    userGoal: sessionParams.userGoal || `Master the core concepts of ${sessionParams.topic} at a ${sessionParams.level} level`,
    strengths: sessionParams.strengths.join(', ') || 'None specified',
    gaps: sessionParams.gaps.join(', ') || 'None specified',
    constraints: sessionParams.constraints.join(', ') || 'None specified',
    allowExternal: sessionParams.allowExternal ? 'Yes' : 'No',
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

  // Additional validation is handled by the schema's superRefine
  const blueprint = parsed.data;

  // Create the message content
  // break long line into multiple lines
  const content = [
    `Based on your assessment (${Math.round(confidence * 100)}% confidence),`,
    `I've created a personalized learning plan for "${blueprint.learnerProfile.topic}".`,
    `The session will focus on ${blueprint.session.primaryConcept}`,
    `with ${blueprint.session.practiceBlocks.length} practice activities.`
  ].join(' ');

  // Return state updates
  return {
    messages: [new AIMessage(content)],
    sessionBlueprint: blueprint,
    topic: sessionParams.topic,
  };
};
