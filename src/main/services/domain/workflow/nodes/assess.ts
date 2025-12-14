/**
 * Workflow Node: ASSESS
 *
 * Mermaid Mapping (Line 8): "Assessment Agent: Analyze Readiness"
 * Part of Path A: Fast Track Assessment
 *
 * Flow Context:
 * - Triggered after: DelegateConf (Orchestrator: Request Assessment)
 * - Triggers: SendReport (Assessment Agent: Send Readiness Report)
 *
 * Purpose:
 * Analyzes user's readiness for a topic by:
 * 1. Fetching profile & history from knowledge graph
 * 2. Calculating confidence score (0-100%) based on:
 *    - Past practice attempts (weighted by recency)
 *    - Recent conversation signals
 *    - Gap identification
 * 3. Returns confidence percentage for orchestration decisions
 *
 * Decision Impact:
 * - Confidence >= 80% → Path A continues (Fast Track)
 * - Confidence < 80% → Path B begins (Standard Learning)
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { parseScore } from '../parse-score';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';
import { NodeName } from '../types';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Utility to clamp a number to the range [0, 1]
 * @param x - The number to clamp
 * @returns The clamped value between 0 and 1
 */
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * Global chat prompt template for confidence assessment
 * Reused across all assessNode calls for efficiency
 */
const ASSESSMENT_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', 'You are an assessment agent analyzing user readiness for learning topics.'],
  [
    'human',
    [
      'Assess confidence (0-100%) for topic: {topic}',
      '',
      'Practice History:',
      '- Pass: {passCount}',
      '- Partial: {partialCount}',
      '- Fail: {failCount}',
      '- Average Rubric Score: {rubricAvg}%',
      '',
      'Recent Conversation:',
      '{recentMessages}',
      '',
      'Return your response in the format: "Score: NN%"'
    ].join('\n'),
  ],
]);

/**
 * Practice attempt result types for type safety
 */
type PracticeResult = 'pass' | 'partial' | 'fail';

/**
 * Practice attempt with rubric scores
 */
interface PracticeAttempt {
  result: PracticeResult;
  rubricScores?: {
    retrieval?: number;
    application?: number;
    teachBack?: number;
  };
  errorTags?: string[];
}

/**
 * Metrics extracted from practice history for confidence calculation
 */
interface PracticeMetrics {
  passCount: number;
  partialCount: number;
  failCount: number;
  rubricAverage: number;
  gaps: string[];
}

/**
 * Extracts practice metrics from attempts history
 *
 * @param attempts - Array of practice attempts
 * @returns Object containing pass/partial/fail counts, average rubric score, and identified gaps
 */
function extractPracticeMetrics(attempts: PracticeAttempt[]): PracticeMetrics {
  const gaps = new Set<string>();

  // Calculate outcome counts and collect rubric scores
  const outcomeCounts = { pass: 0, partial: 0, fail: 0 };
  const allRubricScores: number[] = [];

  for (const attempt of attempts) {
    // Count outcomes
    outcomeCounts[attempt.result]++;

    // Collect all rubric scores for averaging
    const rubric = attempt.rubricScores;
    if (rubric) {
      const scores = [rubric.retrieval, rubric.application, rubric.teachBack]
        .filter((v): v is number => typeof v === 'number');
      allRubricScores.push(...scores);
    }

    // Collect error tags as gaps for future remediation
    (attempt.errorTags ?? []).forEach(tag => gaps.add(tag));
  }

  // Calculate average rubric score (0-1 range)
  const rubricAverage = allRubricScores.length > 0
    ? allRubricScores.reduce((sum, score) => sum + score, 0) / (allRubricScores.length * 100)
    : 0;

  return {
    passCount: outcomeCounts.pass,
    partialCount: outcomeCounts.partial,
    failCount: outcomeCounts.fail,
    rubricAverage,
    gaps: Array.from(gaps),
  };
}

/**
 * Formats recent conversation messages for LLM analysis
 *
 * @param messages - Array of LangChain messages
 * @param maxMessages - Maximum number of recent messages to include
 * @param maxMessageLength - Maximum length per message
 * @returns Formatted string of conversation history
 */
function formatRecentMessages(
  messages: Array<HumanMessage | AIMessage>,
  maxMessages = 20,
  maxMessageLength = 200
): string {
  return messages
    .slice(-maxMessages)
    .map(msg => {
      // Use instanceof for type-safe message type detection
      const role = msg instanceof HumanMessage ? 'user' : 'assistant';
      const content = msg.content.length > maxMessageLength
        ? msg.content.slice(0, maxMessageLength)
        : msg.content;
      return `${role}: ${content}`;
    })
    .join('\n');
}

export const assessNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // Initialize chunk emitter for streaming status updates
  const emitter = createChunkEmitter(config);
  const nodeName = NodeName.ASSESS;
  const toolCallId = generateId(nodeName);

  // Emit input start for observability
  emitter.toolInputStart(toolCallId, nodeName);

  // Step 1: Fetch related concepts from knowledge graph
  const knowledgeResult = await deps.knowledgeService.searchKnowledge({
    query: state.topic,
    limit: 5,
  });

  // Extract concept IDs for practice history lookup
  const conceptIds = (knowledgeResult?.results ?? [])
    .map(result => result.id)
    .filter((id): id is string => Boolean(id));

  // Step 2: Retrieve practice history for confidence calculation
  const practiceHistory = await deps.learningService.getPracticeHistory({
    conceptIds,
    limit: 100,
  });

  // Step 3: Extract metrics from practice history
  const practiceMetrics = extractPracticeMetrics(practiceHistory);

  // Step 4: Format recent conversation for LLM analysis
  const recentMessages = formatRecentMessages(state.messages as (HumanMessage | AIMessage)[]);

  // Step 5: Get AI model and generate confidence assessment
  const model = await deps.providerFactory.getModel();

  // Format the prompt using the global ChatPromptTemplate
  const messages = await ASSESSMENT_PROMPT.formatMessages({
    topic: state.topic,
    passCount: String(practiceMetrics.passCount),
    partialCount: String(practiceMetrics.partialCount),
    failCount: String(practiceMetrics.failCount),
    rubricAvg: String(Math.round(practiceMetrics.rubricAverage * 100)),
    recentMessages,
  });

  // Invoke model with the formatted messages
  const modelResponse = await model.invoke(messages);

  // Extract confidence score from model response
  const rawResponse = String(modelResponse.content ?? modelResponse ?? '');
  const parsedConfidence = parseScore(rawResponse);

  // Clamp confidence to valid range [0, 1]
  const confidence = clamp01(parsedConfidence ?? 0.5);

  // Format confidence message for user
  const confidenceMessage = `Confidence: ${Math.round(confidence * 100)}%`;

  // Step 6: Emit tool output for orchestration
  emitter.toolOutputAvailable(toolCallId, {
    ok: true,
    data: {
      confidence,
      gaps: practiceMetrics.gaps,
      content: confidenceMessage,
      topic: state.topic,
    },
  });

  // Step 7: Return updated state
  return {
    messages: [new AIMessage(confidenceMessage)],
    confidence,
    gaps: practiceMetrics.gaps,
  };
};
