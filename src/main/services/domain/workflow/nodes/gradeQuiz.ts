/**
 * Grade Quiz Node (ASSISTANT Role)
 *
 * OVERVIEW:
 * This node evaluates the user's responses to the fast track diagnostic quiz.
 * It provides constructive feedback and calculates a mastery score to determine
 * the appropriate learning path.
 *
 * CRITICAL DECISION POINT:
 * This node's output determines the user's next path:
 * - HIGH SCORE (≥ 90%): User knows the material → COMPLETE
 * - LOW SCORE (< 90%): User has gaps → TEACH (standard learning)
 *
 * USER EXPERIENCE:
 * - Constructive, not judgmental
 * - Educational feedback
 * - Explains what was missed
 * - Encourages learning
 * - Clear about next steps
 *
 * WHY ASSESSMENT MATTERS:
 * 1. Validates self-reported confidence objectively
 * 2. Identifies specific knowledge gaps
 * 3. Prevents unnecessary re-teaching
 * 4. Personalizes learning path
 * 5. Saves time for knowledgeable users
 *
 * ASSESSMENT APPROACH:
 * - AI evaluates content, not just correctness
 * - Looks for understanding, not just answers
 * - Considers partial knowledge
 * - Identifies misconceptions
 * - Provides actionable feedback
 *
 * GRADING CRITERIA:
 * Based on:
 * 1. Factual accuracy
 * 2. Conceptual understanding
 * 3. Application ability
 * 4. Depth of knowledge
 * 5. Communication clarity
 *
 * FEEDBACK PRINCIPLES:
 * - Specific, not generic
 * - Educational, not just scores
 * - Identifies gaps clearly
 * - Suggests next steps
 * - Maintains user confidence
 *
 * @param deps - Workflow dependencies
 *   - providerFactory: For accessing AI models
 *
 * @param state - Current workflow state
 *   - topic: The learning topic
 *   - practicePrompt: The quiz questions
 *   - userAnswer: User's responses
 *   - confidence: Original self-reported confidence
 *
 * @returns Updated state
 *   - mastery: Numeric score (0.0-1.0)
 *   - messages: Assistant message with feedback
 */
export const gradeQuizNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  /**
   * EXTRACT QUIZ DATA:
   * Get the quiz content and user's answers from state
   * These were set by the FAST_TRACK_QUIZ node
   */
  const question = state.practicePrompt ?? '';
  const answer = state.userAnswer ?? '';

  /**
   * VALIDATION: Ensure we have data to grade
   * If no question or answer, cannot perform assessment
   */
  if (!question || !answer) {
    throw new Error('Cannot grade quiz: missing question or answer');
  }

  /**
   * STEP 1: INVOKE AI GRADER
   *
   * WHY: Need AI to evaluate user's knowledge level
   * AI can assess:
   * - Understanding depth
   * - Misconceptions
   * - Partial knowledge
   * - Application ability
   *
   * DESIGN:
   * Simple prompt requesting structured score output
   * Score format: "Score: NN%" for easy parsing
   */
  const { model } = await deps.providerFactory.getModel('chat');

  /**
   * GRADING PROMPT DESIGN:
   * Instructs AI to:
   * - Evaluate answer quality
   * - Identify knowledge gaps
   * - Provide constructive feedback
   * - Return score in parseable format
   *
   * PROMPT STRUCTURE:
   * 1. Context: topic, question, answer
   * 2. Task: grade and analyze
   * 3. Output: score format requirement
   *
   * NOTE: Simple prompt works well for this focused task
   */
  const gradingPrompt = `Grade the user's diagnostic quiz response.

Topic: ${state.topic}
Question: ${question}
Answer: ${answer}

Please provide:
1. A score from 0-100% (return as "Score: NN%")
2. Brief feedback on what they demonstrated well
3. Any knowledge gaps identified
4. Suggestions for improvement

Be encouraging and constructive. Focus on what they know rather than what they missed.`;

  const res = await model.invoke([new HumanMessage(gradingPrompt)]);

  /**
   * STEP 2: EXTRACT GRADING CONTENT
   *
   * WHY: Need the AI's feedback message for the user
   * This will be displayed as an assistant message
   */
  const content = String(res.content ?? res ?? '');

  /**
   * STEP 3: PARSE MASTERY SCORE
   *
   * WHY: Need numeric score for workflow decision
   * parseScore utility extracts "Score: NN%" format
   *
   * PARSING:
   * - Extracts numeric value from "Score: 85%" format
   * - Converts to 0.0-1.0 scale
   * - Handles missing/invalid scores gracefully
   *
   * FALLBACK:
   * If parsing fails, default to 0.5 (neutral)
   * This prevents workflow from breaking
   */
  const mastery = parseScore(content) ?? 0.5;

  /**
   * STEP 4: RETURN ASSESSMENT RESULTS
   *
   * WHAT:
   * - mastery: Numeric score for decision logic
   * - messages: Feedback for user
   *
   * HOW USED:
   * - Mastery feeds into edge decision (CheckMastery)
   * - Messages displayed to user for learning
   */
  return {
    mastery,
    messages: [new AIMessage(content)],
  };
};
