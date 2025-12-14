/**
 * Workflow Node: PRACTICE (TOOL Role with AI SDK Chunk Emission)
 *
 * Mermaid Mapping (Line 42): "Practice Agent: Generate Problem"
 * Part of Path B: Standard Learning Loop
 *
 * Flow Context:
 * - Triggered after: INTERACTIVE_TEACH (when user is ready)
 * - Triggers: EVALUATE (Assessment Agent: Evaluate)
 *
 * Purpose:
 * Generates personalized practice exercises by:
 * 1. Emitting AI SDK chunks directly via config.writer()
 * 2. Searching knowledge graph for relevant concepts
 * 3. Building context from focus and related concepts
 * 4. Invoking AI model to create structured practice data
 * 5. Emitting tool lifecycle chunks (input-start, input-available, output-available)
 * 6. Returning conversational message for chat flow
 * 7. Waiting for user response via interrupt
 * 8. Passing user answer to EVALUATE node
 *
 * PHILOSOPHY:
 * - Direct AI SDK chunk emission for tool lifecycle
 * - Zero translation layer - nodes emit exactly what frontend expects
 * - Type-safe chunk creation with comprehensive documentation
 * - Clean separation: chunks for lifecycle, messages for conversation
 *
 * CHUNK EMISSION PATTERN:
 * - tool-input-start: Begin tool invocation
 * - tool-input-available: Show input parameters
 * - tool-output-available: Show generated exercises
 * - Optional: text-start/text-delta/text-end for progress updates
 *
 * Also invoked in Remediation Path (Line 76): After Hint (Learning Agent: Targeted Hint)
 *
 * Outputs:
 * - messages: Assistant message containing conversational summary
 * - userAnswer: User's response to the practice exercises
 */

import { randomUUID } from 'node:crypto';
import { interrupt } from '@langchain/langgraph';
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage } from '@langchain/core/messages';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Practice generation configuration constants
 */
const MAX_FOCUS_CONCEPTS = 5;
const MAX_RELATED_CONCEPTS = 6;
const KNOWLEDGE_SEARCH_LIMIT = 6;
const EXERCISE_COUNT_MIN = 2;
const EXERCISE_COUNT_MAX = 3;

/**
 * Chat prompt template for generating practice exercises
 */
const PRACTICE_GENERATION_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    'You are a supportive tutor creating personalized practice exercises. Be conversational and encouraging.'
  ],
  [
    'user',
    [
      'Create {exerciseCount} practice exercises for the user.',
      '',
      'Context:',
      'Topic: {topic}',
      'Key concepts to practice: {focusConcepts}',
      'Related concepts: {relatedConcepts}',
      '',
      'Generate the exercises naturally, not as JSON. Include:',
      '- Clear, conversational instructions',
      '- Concrete examples to guide them',
      '- Helpful hints (not full answers)',
      '- Encouraging language to build confidence',
      '',
      'Make it feel like a supportive tutor guiding practice.',
      'End by asking them to share their work or answers.'
    ].join('\n')
  ]
]);

/**
 * Practice Workflow Node (TOOL Role with Chunk Emission)
 *
 * OVERVIEW:
 * This node generates personalized practice exercises by emitting AI SDK chunks directly
 * via config.writer(). This enables direct control over streaming output without
 * translation layers or custom event schemas.
 *
 * KEY DESIGN CHANGES (v3.0):
 * 1. Direct AI SDK chunk emission via createChunkEmitter()
 * 2. Emits tool lifecycle chunks (input-start, input-available, output-available)
 * 3. Returns conversational message for chat flow
 * 4. Zero translation layer - frontend receives exactly what node emits
 *
 * EXECUTION FLOW:
 * 1. Create chunk emitter from config
 * 2. Check if practice already generated (handle resume case)
 * 3. Emit tool-input-start chunk
 * 4. Search knowledge graph for relevant concepts
 * 5. Emit tool-input-available with search parameters
 * 6. Gather related concepts for comprehensive context
 * 7. Generate practice content via AI
 * 8. Emit tool-output-available with exercises
 * 9. Record analytics for this practice session
 * 10. Return conversational message for chat flow
 * 11. Interrupt workflow to wait for user response
 * 12. Extract and store user's practice answers
 *
 * USER EXPERIENCE:
 * - Tool UI shows structured exercises from chunks
 * - Chat shows conversational summary message
 * - Clean separation of concerns (lifecycle vs content)
 *
 * @param deps - Workflow dependencies (services, factories, etc.)
 *   - knowledgeService: For searching concepts and relationships
 *   - practiceService: For recording analytics
 *   - providerFactory: For accessing AI models
 *
 * @param state - Current workflow state
 *   - topic: The learning topic to generate practice for
 *   - messages: Conversation history
 *   - practicePrompt: Previously generated practice (for resume)
 *   - userAnswer: User's previous answers (for resume)
 *
 * @param config - LangGraph configuration with optional writer
 *
 * @returns Updated state
 *   - messages: Assistant message with conversational summary
 *   - practicePrompt: The practice exercises (structured)
 *   - userAnswer: User's response to practice
 */
export const practiceNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: any
) => {
  // Create chunk emitter for direct AI SDK chunk emission
  const emitter = createChunkEmitter(config);
  /**
   * RESUME DETECTION:
   * Check if practice has already been generated for this session.
   * This handles cases where:
   * - User resumed after interruption
   * - Workflow is continuing from a checkpoint
   * - Previous execution generated practice already
   *
   * We detect this by checking:
   * 1. If practicePrompt exists in state
   * 2. If there's at least one AIMessage in the conversation
   */
  const hasGeneratedPractice = state.practicePrompt &&
    (state.messages ?? []).some(m => m instanceof AIMessage);

  // If practice already generated, just return current state (resume case)
  if (hasGeneratedPractice) {
    return state;
  }

  /**
   * EMIT TOOL-INPUT-START CHUNK
   *
   * WHY: Announce the start of practice generation to the UI
   * This helps users understand what's happening during the tool execution
   *
   * WHAT: Emit tool-input-start with:
   * - toolCallId: Unique identifier for this tool invocation
   * - toolName: 'Practice' (the node name)
   */
  const toolCallId = generateId('tool');
  emitter.toolInputStart(toolCallId, 'Practice');

  /**
   * STEP 1: COLLECT CONTEXT FROM KNOWLEDGE GRAPH
   *
   * WHY: We need to understand what concepts the user is learning about
   * to generate relevant, targeted practice exercises.
   *
   * WHAT: Search the knowledge graph for:
   * - Primary topic concepts
   * - Related concepts that reinforce learning
   * - Hierarchical relationships
   *
   * HOW:
   * - Use knowledgeService.searchKnowledge() to find concepts
   * - Limit results to top 6 most relevant
   * - Extract unique concept titles
   * - Filter out null/undefined values
   */
  const searchParams = {
    query: state.topic,
    limit: KNOWLEDGE_SEARCH_LIMIT,
  };

  emitter.toolInputAvailable(toolCallId, 'Practice', searchParams);

  const searchResult = await deps.knowledgeService.searchKnowledge(searchParams);

  /**
   * VALIDATION: Ensure we found relevant knowledge
   *
   * WHY: Cannot generate meaningful practice without context
   * If no concepts found, practice would be generic and unhelpful
   *
   * ERROR HANDLING: Throw descriptive error to help debugging
   * This prevents silent failures that would confuse users
   */
  if (!searchResult.results.length) {
    throw new Error(`No knowledge found for topic: ${state.topic}. ` +
      'Cannot generate practice without relevant concepts.');
  }

  /**
   * EXTRACT FOCUS CONCEPTS:
   * These are the PRIMARY concepts the practice should target.
   *
   * PROCESS:
   * 1. Map search results to concept titles
   * 2. Filter out null/undefined titles
   * 3. Remove duplicates using Set
   * 4. Limit to top MAX_FOCUS_CONCEPTS most relevant
   *
   * RATIONALE: Limit to avoid overwhelming user with too many concepts
   */
  const focusConcepts = Array.from(
    new Set(searchResult.results.map((result) => result.title).filter(Boolean))
  ).slice(0, MAX_FOCUS_CONCEPTS);

  /**
   * STEP 2: GATHER RELATED CONCEPTS
   *
   * WHY: Learning is more effective when concepts are connected
   * Related concepts help reinforce the primary topic
   *
   * WHAT: Find concepts that are:
   * - Connected to primary topic in knowledge graph
   * - Part of the same learning cluster
   * - Useful for comprehensive understanding
   */
  const relatedSet = new Set<string>();

  // Only fetch related concepts if we have a valid concept ID
  // First result is typically the most relevant
  if (searchResult.results[0]?.id) {
    const related = await deps.knowledgeService.getRelatedConcepts(searchResult.results[0].id);
    related.relatedConcepts.forEach((rel) => relatedSet.add(rel.name));
  }

  /**
   * LIMIT RELATED CONCEPTS:
   * Similar to focus concepts, limit to avoid overwhelming
   */
  const relatedConcepts = Array.from(relatedSet).slice(0, MAX_RELATED_CONCEPTS);

  /**
   * STEP 3: GENERATE NATURAL LANGUAGE PRACTICE CONTENT
   *
   * WHY: ASSISTANT role uses natural conversation, not structured data
   * Natural language is more engaging and easier to understand
   *
   * WHAT: AI generates:
   * - EXERCISE_COUNT_MIN-EXERCISE_COUNT_MAX practice exercises
   * - Clear, conversational instructions
   * - Examples to guide user
   * - Helpful hints (not answers)
   * - Encouraging tone
   *
   * HOW:
   * - Get AI model from provider factory
   * - Use ChatPromptTemplate for structured prompt
   * - Provide context about topic and concepts
   * - Ask for natural language output (not JSON)
   * - Emphasize conversational, encouraging tone
   */
  const model = await deps.providerFactory.getModel();

  // Format the prompt using ChatPromptTemplate
  const messages = await PRACTICE_GENERATION_TEMPLATE.formatMessages({
    topic: state.topic,
    focusConcepts: focusConcepts.join(', '),
    relatedConcepts: relatedConcepts.join(', '),
    exerciseCount: `${EXERCISE_COUNT_MIN}-${EXERCISE_COUNT_MAX}`,
  });

  const response = await model.invoke(messages);

  /**
   * EXTRACT PRACTICE CONTENT:
   * Convert AI response to string for display to user
   */
  const practiceContent = String(response.content ?? '');

  /**
   * EMIT CONVERSATIONAL MESSAGE CHUNKS
   *
   * WHY: Users need to see the practice content in the chat
   * We emit text chunks for the conversational message
   *
   * WHAT: Emit text-start, text-delta, text-end chunks
   * This wraps the practice content in the proper text envelope
   */
  const messageId = generateId('msg');
  emitter.textStart(messageId);
  emitter.textDelta(messageId, practiceContent);
  emitter.textEnd(messageId);

  /**
   * EMIT TOOL-OUTPUT-AVAILABLE CHUNK
   *
   * WHY: Announce completion of practice generation to the UI
   * This provides the structured exercises data to the tool renderer
   *
   * WHAT: Emit tool-output-available with:
   * - toolCallId: Same ID from tool-input-start
   * - output: Structured data containing the generated exercises
   *
   * STRUCTURE: { ok: true, data: { exercises: [...], summary: string } }
   */
  const practiceData = {
    exercises: [
      {
        id: `exercise-${Date.now()}`,
        content: practiceContent,
        focusConcepts,
        relatedConcepts,
      }
    ],
    summary: `Generated practice exercises for ${state.topic}`,
    topic: state.topic,
    focusConcepts,
    relatedConcepts,
  };

  emitter.toolOutputAvailable(toolCallId, {
    ok: true,
    data: practiceData
  });

  /**
   * STEP 4: RECORD ANALYTICS
   *
   * WHY: Track learning progress and practice patterns
   * Analytics help improve the system and understand user behavior
   *
   * WHAT: Record
   * - Task ID (unique identifier for this practice session)
   * - Concept IDs (which concepts were practiced)
   * - Result status (partial = in progress, will update later)
   * - Timestamp (for tracking learning over time)
   */
  await deps.practiceService.recordPracticeAttempt({
    taskId: `workflow_${Date.now()}`,
    conceptIds: searchResult.results.map((r) => r.id),
    result: 'partial', // Updated to 'pass'/'fail' after evaluation
    timestamp: new Date().toISOString(),
  });

  /**
   * STEP 5: INTERRUPT WORKFLOW
   *
   * WHY: Practice requires user interaction
   * User needs time to:
   * - Read the exercises
   * - Think through solutions
   * - Complete the work
   * - Prepare answers
   *
   * HOW: Use LangGraph's interrupt feature
   * - Workflow pauses here
   * - UI displays practice content to user
   * - User works on exercises
   * - User submits answers
   * - Workflow resumes automatically
   */
  const questionId = randomUUID();

  const resumeValue = await interrupt({
    type: 'await_user_input',
    prompt: practiceContent,
    questionId,
    instruction: 'Complete the practice exercises. Share your work and thought process. ' +
      'There are no wrong answers - this is about learning and practice.',
  });

  /**
   * STEP 6: EXTRACT USER ANSWER
   *
   * WHY: Need to capture user's response for evaluation
   * The answer will be graded in the EVALUATE node
   *
   * EXTRACTION LOGIC:
   * Handle multiple possible resume value formats:
   * 1. Direct string answer
   * 2. Object with 'answer' property
   * 3. Object with 'content' property
   *
   * Default to empty string if no answer found
   */
  const answer = typeof resumeValue === 'string'
    ? resumeValue
    : (resumeValue as { answer?: string; content?: string })?.answer ??
      (resumeValue as { answer?: string; content?: string })?.content ??
      '';

  /**
   * RETURN UPDATED STATE:
   * Provide all necessary data for next node (EVALUATE)
   *
   * NOTE: messages stay in state for LangGraph's internal history
   * Chunks are emitted for real-time UI streaming
   */
  return {
    // Add practice content as assistant message for conversation flow (LangGraph history)
    messages: [new AIMessage(practiceContent)],
    // Store practice content for potential UI rendering
    practicePrompt: practiceContent,
    // Store user's answer for evaluation
    userAnswer: answer,
  };
};
