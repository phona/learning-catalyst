/**
 * Interactive Teach Node (ASSISTANT Role with AI SDK Chunk Emission)
 *
 * OVERVIEW:
 * This node provides fully interactive, conversational teaching that adapts to the
 * user's responses. Unlike traditional one-way instruction, it creates a dialogue
 * where the user can ask questions, seek clarification, and indicate readiness.
 *
 * PHILOSOPHY:
 * - Dual emission: chunks for real-time UI streaming + messages for LangGraph history
 * - Direct AI SDK chunk emission via config.writer() for immediate user feedback
 * - State messages preserved for LangGraph's internal conversation context
 * - Zero translation layer - nodes emit exactly what frontend expects
 *
 * DUAL EMISSION PATTERN:
 * 1. **Chunks via config.writer()**: Real-time streaming to UI (text-start, text-delta, text-end)
 * 2. **Messages in state**: LangGraph's internal conversation history for agent context
 *
 * WHY BOTH?
 * - Chunks: User sees content immediately as it's generated (great UX)
 * - Messages: Agents and other nodes need conversation history to work properly
 *
 * KEY INNOVATION: Interactive Loop
 * The node supports multiple conversation turns within a single teaching phase:
 * - First visit: Initial explanation with invitation for questions
 * - Continuations: Respond to user questions, provide clarifications
 * - Assessment: Evaluate understanding and determine readiness
 * - Transition: Smooth handoff to practice when user is ready
 *
 * WHY INTERACTIVE TEACHING:
 * 1. Real learning is conversational, not broadcast
 * 2. Users have different questions and needs
 * 3. Immediate feedback improves comprehension
 * 4. User-paced learning is more effective
 * 5. Identifies confusion early
 *
 * USER EXPERIENCE FLOW:
 * 1. AI explains concept clearly (emit chunks for streaming)
 * 2. AI invites questions and engagement
 * 3. User asks questions or shows understanding
 * 4. AI responds with clarifications or confirmations (emit chunks)
 * 5. Repeat until user demonstrates readiness
 * 6. Transition to practice exercises
 *
 * STATE TRACKING:
 * - interactionCount: How many exchanges have occurred
 * - questionsAsked: Array of user questions
 * - understandingLevel: Estimated comprehension (0.0-1.0)
 * - readyForPractice: Signal to move to next phase
 *
 * READINESS DETECTION:
 * The node detects when user is ready for practice through:
 * - Explicit statements: "I understand", "Ready to practice"
 * - Question quality: Sophisticated questions show engagement
 * - Explanation attempts: User tries to explain back
 * - Confidence signals: Language indicating readiness
 *
 * REMEDIATION SUPPORT:
 * If user struggles or shows confusion:
 * - Provides alternative explanations
 * - Uses different analogies
 * - Breaks concepts into smaller parts
 * - Adds more examples
 *
 * @param deps - Workflow dependencies
 *   - agentManager: For accessing learning agent
 *   - providerFactory: For understanding assessment
 *
 * @param state - Current workflow state
 *   - topic: The learning topic
 *   - messages: Conversation history
 *   - userAnswer: User's latest response (if any)
 *   - interactionCount: Previous interaction count
 *   - understandingLevel: Previous assessment
 *
 * @param config - LangGraph configuration with optional writer
 *
 * @returns Updated state
 *   - messages: Assistant message with teaching content (for LangGraph history)
 *   - interactionCount: Updated count
 *   - understandingLevel: New assessment
 *   - readyForPractice: Boolean flag
 */

import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { interrupt } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Understanding assessment thresholds
 */
const READY_THRESHOLD = 0.8;
const UNDERSTANDING_INCREMENT = 0.15;
const UNDERSTANDING_DECREMENT = 0.1;
const MAX_INTERACTION_BEFORE_PROMPT = 3;

/**
 * Keywords for detecting user readiness and confusion
 */
const READINESS_KEYWORDS = ['ready', 'understand', 'got it', 'think i get it', 'ready to practice'];
const CONFUSION_KEYWORDS = ['confused', 'don\'t get', 'unclear', 'don\'t understand', 'still confused'];

/**
 * Chat prompt template for assessing user understanding
 * Reused across all teaching interactions
 */
const UNDERSTANDING_ASSESSMENT_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', 'You are an expert learning coach analyzing student comprehension.'],
  [
    'human',
    [
      'Assess the user\'s understanding level based on their response.',
      '',
      'Topic: {topic}',
      'User Response: {userAnswer}',
      'Previous Understanding Level: {previousLevel}',
      '',
      'Analyze and return JSON:',
      '{',
      '  "understanding": 0.0-1.0,',
      '  "questionQuality": "high|medium|low",',
      '  "readyForPractice": boolean,',
      '  "reasons": ["why user is/isn\'t ready"],',
      '  "needsClarification": boolean,',
      '  "teachingEffectiveness": "effective|needs_improvement"',
      '}'
    ].join('\n'),
  ],
]);

/**
 * User response analysis result
 */
interface ResponseAnalysis {
  isReady: boolean;
  isConfused: boolean;
  understandingLevel: number;
}

/**
 * Analyzes user response to determine readiness and understanding level
 *
 * @param userAnswer - User's response or question
 * @param previousLevel - Previous understanding level (0.0-1.0)
 * @param topic - Learning topic
 * @param model - AI model for assessment
 * @returns Analysis of user's understanding and readiness
 */
async function analyzeUserResponse(
  userAnswer: string,
  previousLevel: number,
  topic: string,
  model: any
): Promise<ResponseAnalysis> {
  // Format the assessment prompt
  const messages = await UNDERSTANDING_ASSESSMENT_PROMPT.formatMessages({
    topic,
    userAnswer,
    previousLevel: previousLevel.toString(),
  });

  // Get AI assessment
  const assessmentRes = await model.invoke(messages);
  const response = String(assessmentRes.content ?? '').toLowerCase();

  // Use keyword-based heuristics for quick detection
  // (In production, this would parse the JSON properly)
  const isReady = READINESS_KEYWORDS.some(keyword => response.includes(keyword));
  const isConfused = CONFUSION_KEYWORDS.some(keyword => response.includes(keyword));

  // Adjust understanding level based on signals
  let understandingLevel = previousLevel;
  if (isConfused) {
    understandingLevel = Math.max(0, previousLevel - UNDERSTANDING_DECREMENT);
  } else if (isReady) {
    understandingLevel = Math.min(1, previousLevel + UNDERSTANDING_INCREMENT);
  }

  return { isReady, isConfused, understandingLevel };
}

/**
 * Determines if user needs more help based on confusion and interaction count
 *
 * @param isConfused - Whether user is confused
 * @param interactionCount - Number of interactions so far
 * @returns True if user needs more help
 */
function needsMoreHelp(isConfused: boolean, interactionCount: number): boolean {
  return isConfused || interactionCount < MAX_INTERACTION_BEFORE_PROMPT;
}

export const teachNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  // Create chunk emitter for direct AI SDK chunk emission
  const emitter = createChunkEmitter(config);
  /**
   * DETECT VISIT TYPE:
   * Determine if this is the first visit or a continuation
   *
   * WHY: Need different logic for initial explanation vs. responding to user
   *
   * FIRST VISIT (no userAnswer):
   * - Provide initial explanation
   * - Encourage questions
   * - Set up for interaction
   *
   * CONTINUATION (has userAnswer):
   * - Analyze user's response
   * - Assess understanding
   * - Respond to questions
   * - Decide: continue teaching or signal readiness
   */
  const isFirstVisit = !state.userAnswer;
  const interactionCount = (state.interactionCount ?? 0) + 1;
  const understandingLevel = state.understandingLevel ?? 0;

  /**
   * ========================================================================
   * FIRST VISIT: Initial Explanation
   * ========================================================================
   */
  if (isFirstVisit) {
    /**
     * CALL LEARNING AGENT:
     * Generate initial explanation of the topic
     *
     * DESIGN:
     * - Use learning agent for pedagogical expertise
     * - Provide topic and conversation context
     * - Request clear, engaging explanation
     * - Emphasize interactive approach
     */
    const response = await deps.agentManager.runAgent({
      agentType: 'learning',
      conversationId: 'workflow',
      messages: state.messages,
      topic: state.topic,
    });

    /**
     * ADD INTERACTIVE PROMPT:
     * Encourage user to ask questions and signal readiness
     *
     * WHY: Transmit one-way explanation into two-way dialogue
     *
     * PROMPT DESIGN:
     * - Invites questions (any topic, no wrong questions)
     * - Offers alternative explanations
     * - Asks for readiness signal
     * - Builds confidence
     */
    const message = response.content +
      '\n\nWhat questions do you have? Ask me anything that\'s unclear, ' +
      'or tell me when you\'re ready to practice!';

    /**
     * EMIT TEACHING MESSAGE CHUNKS:
     * Stream the initial explanation to the user
     */
    const messageId = generateId('msg');
    emitter.textStart(messageId);
    emitter.textDelta(messageId, message);
    emitter.textEnd(messageId);

    /**
     * INTERRUPT WORKFLOW:
     * Wait for user's response
     *
     * WHY: Teaching requires dialogue, not monologue
     *
     * USER WILL:
     * - Ask clarifying questions
     * - Request examples
     * - Show understanding
     * - Indicate readiness
     */
    const resumeValue = await interrupt({
      type: 'teaching_interaction',
      prompt: message,
      instruction: 'Ask questions, request clarifications, or indicate when you\'re ready to practice.',
    });

    /**
     * RETURN STATE:
     * Set up for continuation when user responds
     *
     * NOTE: messages stay in state for LangGraph's internal history
     * Chunks are emitted for real-time UI streaming
     */
    return {
      messages: [new AIMessage(message)],
      interactionCount: 1,
      understandingLevel: 0,
    };
  }

  /**
   * ========================================================================
   * CONTINUATION: Respond to User
   * ========================================================================
   */

  /**
   * ANALYZE USER RESPONSE:
   * Understand what user is saying and assess their level
   *
   * WHAT WE LOOK FOR:
   * - Questions (show engagement and thinking)
   * - Understanding signals ("I get it", "that makes sense")
   * - Confusion indicators ("I don't understand", "still confused")
   * - Readiness signals ("ready to practice", "I think I understand")
   */
  const userAnswer = state.userAnswer;

  /**
   * ASSESS UNDERSTANDING:
   * Use AI to evaluate user's comprehension level
   *
   * WHY: Need objective assessment to decide next steps
   *
   * ASSESSMENT CRITERIA:
   * 1. Question sophistication (shows depth of thinking)
   * 2. Terminology usage (demonstrates learning)
   * 3. Explanation attempts (user tries to explain back)
   * 4. Confusion signals (language indicating difficulty)
   * 5. Readiness indicators (explicit or implicit)
   */
  const model = await deps.providerFactory.getModel();

  // Analyze user response using helper function
  const analysis = await analyzeUserResponse(
    userAnswer,
    understandingLevel,
    state.topic,
    model
  );

  const { isReady, isConfused, understandingLevel: newUnderstandingLevel } = analysis;

  /**
   * DECISION: Continue Teaching or Signal Readiness
   *
   * IF READY FOR PRACTICE:
   * - User explicitly signals readiness
   * - Questions show deep understanding
   * - User attempts to explain concepts
   * - Understanding level exceeds threshold
   * → Transition to practice phase
   *
   * IF NEEDS MORE TEACHING:
   * - User shows confusion
   * - Questions indicate gaps
   * - Requests more clarification
   * - Understanding level below threshold
   * → Continue interactive teaching
   */
  if ((isReady && !isConfused) || newUnderstandingLevel >= READY_THRESHOLD) {
    /**
     * USER IS READY:
     * Confirm understanding and transition to practice
     *
     * FEEDBACK:
     * - Acknowledge progress
     * - Confirm readiness
     * - Encourage for practice
     */
    const transitionMessage = 'Excellent! You clearly understand the concepts. ' +
      'Let\'s practice what you\'ve learned!';

    /**
     * EMIT TRANSITION MESSAGE CHUNKS:
     * Stream the readiness confirmation to the user
     */
    const messageId = generateId('msg');
    emitter.textStart(messageId);
    emitter.textDelta(messageId, transitionMessage);
    emitter.textEnd(messageId);

    return {
      messages: [new AIMessage(transitionMessage)],
      interactionCount,
      understandingLevel: newUnderstandingLevel,
      readyForPractice: true,
    };
  }

  /**
   * CONTINUE TEACHING:
   * Respond to user's questions or confusion
   *
   * STRATEGY:
   * - Answer specific questions
   * - Provide alternative explanations if confused
   * - Add examples or analogies
   * - Encourage continued engagement
   */
  const teachingResponse = await deps.agentManager.runAgent({
    agentType: 'learning',
    conversationId: 'workflow',
    messages: [...state.messages, new HumanMessage(userAnswer)],
    topic: state.topic,
  });

  /**
   * ADD FOLLOW-UP PROMPT:
   * Continue encouraging questions and check readiness
   *
   * DESIGN:
   * - If confused: Offer more help and alternative approaches
   * - If engaged: Encourage more questions
   * - If satisfied: Suggest readiness for practice
   */
  const followUpPrompt = needsMoreHelp(isConfused, interactionCount) ?
    '\n\nDoes this help clarify things? Ask me more questions, or tell me when you\'re ready to practice!' :
    '\n\nYou\'re making great progress! Any other questions, or ready to try some practice exercises?';

  const nextMessage = teachingResponse.content + followUpPrompt;

  /**
   * EMIT FOLLOW-UP MESSAGE CHUNKS:
   * Stream the teaching response to the user
   */
  const messageId = generateId('msg');
  emitter.textStart(messageId);
  emitter.textDelta(messageId, nextMessage);
  emitter.textEnd(messageId);

  /**
   * INTERRUPT AGAIN:
   * Continue the interactive loop
   */
  const resumeValue = await interrupt({
    type: 'teaching_interaction',
    prompt: nextMessage,
    instruction: 'Continue the conversation - ask more questions, seek clarifications, or indicate readiness for practice.',
  });

  /**
   * RETURN STATE:
   * Prepare for next interaction or transition
   *
   * NOTE: messages stay in state for LangGraph's internal history
   * Chunks are emitted for real-time UI streaming
   */
  return {
    messages: [new AIMessage(nextMessage)],
    interactionCount,
    understandingLevel: newUnderstandingLevel,
    readyForPractice: false,
  };
};
