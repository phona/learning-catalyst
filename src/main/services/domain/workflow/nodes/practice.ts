/**
 * Workflow Node: PRACTICE (ASSISTANT Role)
 *
 * Mermaid Mapping (Line 42): "Practice Agent: Generate Problem"
 * Part of Path B: Standard Learning Loop
 *
 * Flow Context:
 * - Triggered after: INTERACTIVE_TEACH (when user is ready)
 * - Triggers: EVALUATE (Assessment Agent: Evaluate)
 *
 * Purpose:
 * Generates personalized practice exercises through natural conversation by:
 * 1. Searching knowledge graph for relevant concepts
 * 2. Building context from focus and related concepts
 * 3. Invoking AI model to create natural language practice content
 * 4. Presenting exercises conversationally with examples and guidance
 * 5. Encouraging user to work through problems
 * 6. Waiting for user response via interrupt
 * 7. Passing user answer to EVALUATE node
 *
 * Also invoked in Remediation Path (Line 76): After Hint (Learning Agent: Targeted Hint)
 *
 * Outputs:
 * - messages: Assistant message containing the practice content
 * - userAnswer: User's response to the practice exercises
 *
 * Note: Uses ASSISTANT role for natural conversation flow, no structured JSON
 */

import { randomUUID } from 'node:crypto';
import { interrupt } from '@langchain/langgraph';
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

/**
 * Practice Workflow Node (ASSISTANT Role)
 *
 * OVERVIEW:
 * This node generates personalized practice exercises through natural conversation
 * with the user. Unlike the previous TOOL role version, it now uses ASSISTANT role
 * for a more natural, conversational experience without structured JSON.
 *
 * KEY DESIGN CHANGES (v2.0):
 * 1. Removed structured JSON output requirement
 * 2. Natural language generation for better user engagement
 * 3. Conversational prompt instead of rigid schema
 * 4. Simplified content formatting
 *
 * EXECUTION FLOW:
 * 1. Check if practice already generated (handle resume case)
 * 2. Search knowledge graph for relevant concepts
 * 3. Gather related concepts for comprehensive context
 * 4. Generate natural language practice content via AI
 * 5. Record analytics for this practice session
 * 6. Interrupt workflow to wait for user response
 * 7. Extract and store user's practice answers
 *
 * USER EXPERIENCE:
 * - Natural, encouraging tone
 * - Clear instructions with examples
 * - Helpful hints without giving away answers
 * - Prompts user to share their work
 * - Maintains conversation flow
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
 * @returns Updated state
 *   - messages: Assistant message with practice content
 *   - practicePrompt: The practice exercises (natural language)
 *   - userAnswer: User's response to practice
 */
export const practiceNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
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
  const searchResult = await deps.knowledgeService.searchKnowledge({
    query: state.topic,
    limit: 6,
  });

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
   * 4. Limit to top 5 most relevant
   *
   * RATIONALE: Limit to 5 to avoid overwhelming user with too many concepts
   */
  const focusConcepts = Array.from(
    new Set(searchResult.results.map((result) => result.title).filter(Boolean))
  ).slice(0, 5);

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
  const relatedConcepts = Array.from(relatedSet).slice(0, 6);

  /**
   * STEP 3: GENERATE NATURAL LANGUAGE PRACTICE CONTENT
   *
   * WHY: ASSISTANT role uses natural conversation, not structured data
   * Natural language is more engaging and easier to understand
   *
   * WHAT: AI generates:
   * - 2-3 practice exercises
   * - Clear, conversational instructions
   * - Examples to guide user
   * - Helpful hints (not answers)
   * - Encouraging tone
   *
   * HOW:
   * - Get AI model from provider factory
   * - Provide context about topic and concepts
   * - Ask for natural language output (not JSON)
   * - Emphasize conversational, encouraging tone
   */
  const { model } = await deps.providerFactory.getModel('learning');

  /**
   * BUILD CONTEXT INFO:
   * Provide AI with structured context in natural language prompt
   */
  const contextInfo = `
Topic: ${state.topic}
Key concepts to practice: ${focusConcepts.join(', ')}
Related concepts: ${relatedConcepts.join(', ')}
  `.trim();

  /**
   * AI PROMPT DESIGN:
   * Unlike previous JSON schema, this is conversational:
   * - Explains what we want (practice session)
   * - Provides context (topic, concepts)
   * - Specifies format (natural language, 2-3 exercises)
   * - Defines style (conversational, encouraging)
   * - Includes elements (instructions, examples, hints)
   * - Ends with engagement (ask user to share)
   */
  const response = await model.invoke([
    new HumanMessage(
      `Create a practice session for the user. Be conversational and encouraging.\n\n` +
      `Context:\n${contextInfo}\n\n` +
      `Generate 2-3 practice exercises. Present them naturally, not as JSON.\n` +
      `Include:\n` +
      `- Clear, conversational instructions\n` +
      `- Concrete examples to guide them\n` +
      `- Helpful hints (not full answers)\n` +
      `- Encouraging language to build confidence\n\n` +
      `Make it feel like a supportive tutor guiding practice.\n` +
      `End by asking them to share their work or answers.`
    )
  ]);

  /**
   * EXTRACT PRACTICE CONTENT:
   * Convert AI response to string for display to user
   */
  const practiceContent = String(response.content ?? '');

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
   */
  return {
    // Add practice content as assistant message for conversation flow
    messages: [new AIMessage(practiceContent)],
    // Store practice content for potential UI rendering
    practicePrompt: practiceContent,
    // Store user's answer for evaluation
    userAnswer: answer,
  };
};
