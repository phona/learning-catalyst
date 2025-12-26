
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { interrupt } from '@langchain/langgraph';
import { randomUUID } from 'crypto';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { streamLLM } from '../utils/stream-llm';

/**
 * Fast Track Quiz Node (ASSISTANT Role)
 *
 * OVERVIEW:
 * This node generates a diagnostic assessment quiz for users who self-reported
 * high confidence in a topic. It quickly verifies their actual knowledge through
 * natural conversation, allowing confident learners to skip basic instruction.
 *
 * USER EXPERIENCE:
 * - Conversational, not test-like
 * - Short and focused (2-3 questions max)
 * - Educational, not evaluative
 * - Respects user's time
 * - Provides constructive feedback
 *
 * WHY FAST TRACK:
 * Many learners already know basic concepts but are forced through repetitive
 * beginner material. This node:
 * 1. Validates self-reported confidence with actual performance
 * 2. Identifies knowledge gaps objectively
 * 3. Allows skipping to advanced content if strong
 * 4. Redirects to appropriate learning path if gaps exist
 * 5. Saves time for experienced learners
 *
 * EXECUTION FLOW:
 * 1. Check if quiz already generated (resume case)
 * 2. Generate natural language diagnostic questions
 * 3. Present quiz conversationally to user
 * 4. Wait for user response via interrupt
 * 5. Extract and store user answers
 * 6. Pass to GRADE_QUIZ node for evaluation
 *
 * BRANCHING DECISION:
 * After grading, user goes to:
 * - COMPLETE: If scored ≥ 90% (already knows material well)
 * - TEACH: If scored < 90% (needs instruction, has identified gaps)
 *
 * ASSISTANT ROLE DESIGN:
 * - Natural language questions, not JSON
 * - Conversational tone, not formal testing
 * - Encourages user, builds confidence
 * - Clear, engaging presentation
 *
 * @param deps - Workflow dependencies
 *   - providerFactory: For accessing AI models
 *
 * @param state - Current workflow state
 *   - topic: The learning topic to assess
 *   - confidence: User's self-reported confidence (high, typically ≥ 75%)
 *   - messages: Conversation history
 *   - practicePrompt: Previously generated quiz (for resume)
 *
 * @returns Updated state
 *   - messages: Assistant message with quiz questions
 *   - practicePrompt: The quiz content
 *   - userAnswer: User's responses to quiz
 */
export const fastTrackQuizNode = (deps: WorkflowDeps) => async (
  state: typeof WorkflowStateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  /**
   * RESUME DETECTION:
   * Check if quiz has already been generated for this session.
   * Handles cases where user resumed after interruption.
   *
   * DETECTION LOGIC:
   * 1. Check if practicePrompt exists in state
   * 2. Check if there's an AIMessage matching the practicePrompt
   * This ensures we don't regenerate the same quiz on resume.
   */
  const hasGeneratedQuiz = state.practicePrompt &&
    (state.messages ?? []).some(m => {
      if (m instanceof AIMessage) {
        return m.content === state.practicePrompt;
      }
      return false;
    });

  // If quiz already generated, return current state (resume case)
  if (hasGeneratedQuiz) {
    return state;
  }

  /**
   * STEP 1: GENERATE DIAGNOSTIC QUIZ CONTENT
   *
   * WHY: Need to create a natural language diagnostic assessment
   * that quickly reveals what the user actually knows.
   *
   * DESIGN PRINCIPLES:
   * - Short: 2-3 focused questions (respect user's time)
   * - Diagnostic: Target core concepts that reveal understanding
   * - Natural: Conversational, not test-like
   * - Educational: User learns even while being assessed
   *
   * HOW:
   * - Get AI model from provider factory
   * - Provide topic context
   * - Ask for natural language output
   * - Emphasize diagnostic nature (not grading)
   * - Use streamLLM for real-time token streaming
   */
  const model = await deps.providerFactory.getModel();
  const streamMode = config.configurable?.llmStreamMode as boolean | undefined;

  /**
   * AI PROMPT DESIGN:
   * Unlike formal tests, this is conversational and diagnostic:
   * - Explains purpose: "Let's see what you already know"
   * - Sets tone: Supportive, not evaluative
   * - Specifies format: Natural language, not forms
   * - Defines scope: Quick check, not comprehensive
   * - Emphasizes learning: Diagnostic questions teach too
   */
  const prompt = `Create a diagnostic quiz for: ${state.topic}

The user self-reported high confidence (≥ 75%), so let's quickly verify what they actually know.

Generate 2-3 diagnostic questions that:
- Are conversational and engaging (not test-like)
- Target core concepts that reveal true understanding
- Can be answered naturally, not just yes/no
- Help identify specific knowledge gaps
- Teach something even while assessing

  Present them in a supportive, encouraging tone:
  "Let's see what you already know about [topic]. I'll ask a few quick questions to understand where you're at."

  End by asking them to share their thoughts/answers.`;
  const { content: quizContent } = await streamLLM({
    model,
    messages: [new HumanMessage(prompt)],
    config,
    streamMode,
  });

  /**
   * STEP 2: TRACK QUIZ SESSION
   *
   * WHY: Generate unique identifier for this quiz session
   * This helps with analytics and debugging.
   *
   * NOTE: In a full implementation, we might record this quiz attempt
   * similar to how practice attempts are recorded.
   */
  const questionId = randomUUID();

  /**
   * STEP 3: INTERRUPT WORKFLOW
   *
   * WHY: Quiz requires user interaction and thinking time
   * User needs to:
   * - Read and understand questions
   * - Recall relevant knowledge
   * - Formulate responses
   * - Share their answers
   *
   * HOW: Use LangGraph's interrupt feature
   * - Workflow pauses here
   * - UI displays quiz to user
   * - User reads and answers
   * - Workflow resumes automatically
   */
  const resumeValue = await interrupt({
    type: 'await_user_input',
    prompt: quizContent,
    questionId,
    instruction: 'Answer the diagnostic questions. Share your thoughts and knowledge - there are no wrong answers!',
  });

  /**
   * STEP 4: EXTRACT USER ANSWER
   *
   * WHY: Need to capture user's responses for grading
   * The GRADE_QUIZ node will evaluate these answers
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
   * Provide all necessary data for next node (GRADE_QUIZ)
   */
  return {
    // Persist both quiz prompt and the user's reply (in chronological order)
    messages: [
      new AIMessage(quizContent),
      new HumanMessage(answer),
    ],
    // Store quiz content for potential UI rendering
    practicePrompt: quizContent,
    // Store user's answer for grading
    userAnswer: answer,
  };
};
