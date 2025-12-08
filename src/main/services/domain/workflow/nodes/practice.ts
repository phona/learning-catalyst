/**
 * Workflow Node: PRACTICE
 *
 * Mermaid Mapping (Line 42): "Practice Agent: Generate Problem"
 * Part of Path B: Standard Learning Loop
 *
 * Flow Context:
 * - Triggered after: MicroCheck (Learning Agent: Quick Concept Check) - when "Yes"
 * - Triggers: Eval (Assessment Agent: Evaluate)
 *
 * Purpose:
 * Generates personalized practice exercises by:
 * 1. Searching knowledge graph for relevant concepts
 * 2. Building context from focus and related concepts
 * 3. Invoking AI model to create structured practice content
 * 4. Formatting exercises with steps, hints, and suggestions
 * 5. Recording the practice attempt for analytics
 * 6. Waiting for user response via interrupt
 * 7. Passing both exercises and answer to EVALUATE node
 *
 * Also invoked in Remediation Path (Line 76): After Hint (Learning Agent: Targeted Hint)
 *
 * Outputs:
 * - practicePrompt: Structured practice exercises formatted for display
 * - messages: Assistant message containing the practice content + user answer
 * - userAnswer: User's response to the practice exercises
 */

import { randomUUID } from 'node:crypto';
import { interrupt } from '@langchain/langgraph';
import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

/**
 * System prompt for practice generation.
 * Enforces strict JSON output with no markdown or explanations.
 * Follows the concept-parsing pattern for reliable structured responses.
 */
const STRICT_PRACTICE_PROMPT = `
You are a practice coach. Generate actionable drills and walk through solutions so the learner can build confidence.
OUTPUT FORMAT: Strict JSON only, no markdown, no code blocks, no explanations.
JSON Schema:
{
  "summary": "string",
  "exercises": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "difficulty": "easy|medium|hard",
      "type": "coding|conceptual|problem_solving|general",
      "steps": ["string"],
      "hints": ["string"],
      "expectedOutcome": "string"
    }
  ],
  "suggestions": ["string"]
}
RESPOND WITH ONLY VALID JSON.
`;

/**
 * Determines practice type based on content analysis.
 * Used to categorize exercises by learning modality.
 * @param content - The topic or content to analyze
 * @returns Practice type classification
 */
const practiceTypeFromContent = (content: string): 'coding' | 'conceptual' | 'problem_solving' | 'general' => {
  const lower = content.toLowerCase();
  if (/(code|function|implement|program)/.test(lower)) return 'coding';
  if (/(explain|concept|compare|define)/.test(lower)) return 'conceptual';
  if (/(solve|problem|equation|math)/.test(lower)) return 'problem_solving';
  return 'general';
};

/**
 * Practice Workflow Node
 *
 * Generates personalized practice exercises by:
 * 1. Collecting evidence from the 2. Building knowledge graph
 * a structured prompt with context
 * 3. Invoking AI model via provider factory
 * 4. Parsing and validating strict JSON response
 * 5. Formatting for display
 * 6. Recording the practice attempt
 * 7. Interrupting to wait for user completion
 * 8. Extracting user answer and passing to EVALUATE
 *
 * This node replaces the specialized PracticeAgent, providing direct
 * control over practice generation while leveraging services for
 * data operations and persistence.
 *
 * @param deps - Workflow dependencies (services, factories, etc.)
 * @param state - Current workflow state containing topic and messages
 * @returns Updated state with practice prompt, assistant message, and user answer
 */
export const practiceNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  // Check if practice already generated
  const hasGeneratedPractice = state.practicePrompt &&
    (state.messages ?? []).some(m => (m as any).role === 'assistant');

  if (!hasGeneratedPractice) {
    // ============================================================================
    // STEP 1: Collect Evidence from Knowledge Graph
    // ============================================================================
    // Search for relevant concepts related to the current topic
    // This provides the AI with context about what the user is learning
    const searchResult = await deps.knowledgeService.searchKnowledge({
      query: state.topic,
      limit: 6,
    });

    // Validate that we found relevant knowledge
    // Throw if no concepts found - cannot generate meaningful practice without context
    if (!searchResult.results.length) {
      throw new Error(`No knowledge found for topic: ${state.topic}`);
    }

    // Extract and deduplicate focus concepts (max 5)
    // These are the primary concepts the practice should target
    const focusConcepts = Array.from(
      new Set(searchResult.results.map((result) => result.title).filter(Boolean))
    ).slice(0, 5);

    // ============================================================================
    // STEP 2: Gather Related Concepts
    // ============================================================================
    // Find concepts related to the primary topic to build a comprehensive
    // practice context that reinforces interconnected knowledge
    const relatedSet = new Set<string>();
    if (searchResult.results[0]?.id) {
      const related = await deps.knowledgeService.getRelatedConcepts(searchResult.results[0].id);
      related.relatedConcepts.forEach((rel) => relatedSet.add(rel.name));
    }

    // Extract related concepts (max 6)
    const relatedConcepts = Array.from(relatedSet).slice(0, 6);

    // Build context summary for the AI prompt
    // This helps the model understand what concepts to connect in exercises
    const contextSummary = [
      `Focus concepts: ${focusConcepts.join(', ') || 'none'}`,
      `Related concepts: ${relatedConcepts.join(', ') || 'none'}`,
    ].join(' | ');

    // ============================================================================
    // STEP 3: Build Structured Prompt Payload
    // ============================================================================
    // Create a JSON payload with all the context the AI needs to generate
    // relevant, personalized practice exercises
    const promptData = {
      practiceType: practiceTypeFromContent(state.topic),
      topic: state.topic,
      difficulty: 'medium' as const,
      count: 3, // Generate 3 exercises per practice session
      focusConcepts,
      relatedConcepts,
      vibe: 'focused',
      context: contextSummary,
    };

    // ============================================================================
    // STEP 4: Invoke AI Model via Provider Factory
    // ============================================================================
    // Use the same pattern as specialized agents:
    // 1. Get model from provider factory (handles config, caching, etc.)
    // 2. Invoke with structured messages (system + human)
    // 3. Parse strict JSON response
    const { model } = await deps.providerFactory.getModel('learning');
    const response = await model.invoke([
      new SystemMessage(STRICT_PRACTICE_PROMPT),
      new HumanMessage(JSON.stringify(promptData, null, 2)),
    ]);

    // ============================================================================
    // STEP 5: Parse and Validate Strict JSON Response
    // ============================================================================
    // Parse the AI's JSON response
    // Note: No fallback - strict parsing ensures data integrity
    const practicePlan = JSON.parse(String(response.content).trim());

    // Validate that we received a valid practice plan structure
    // This ensures the UI receives properly formatted content
    if (!practicePlan.exercises || !Array.isArray(practicePlan.exercises)) {
      throw new Error('Invalid practice plan: missing exercises array');
    }

    // ============================================================================
    // STEP 6: Format Practice Content for Display
    // ============================================================================
    // Convert the structured practice plan into human-readable markdown
    // Format: Title -> Exercises (with steps/hints) -> Suggestions
    const practicePrompt = [
      `## ${practicePlan.summary || `Practice: ${state.topic}`}`,
      '',
      ...practicePlan.exercises.map((ex: any, idx: number) => [
        `### Exercise ${idx + 1}: ${ex.title}`,
        ex.description,
        '',
        '**Steps:**',
        ...ex.steps.map((step: string) => `- ${step}`),
        '',
        '**Hints:**',
        ...ex.hints.map((hint: string) => `- ${hint}`),
        '',
      ]).flat(),
      '',
      '**Suggestions:**',
      ...(practicePlan.suggestions || []).map((s: string) => `- ${s}`),
    ].join('\n');

    // ============================================================================
    // STEP 7: Record Practice Attempt
    // ============================================================================
    // Track this practice session for analytics and progress monitoring
    // Uses practiceService to ensure consistent database operations
    await deps.practiceService.recordPracticeAttempt({
      taskId: `workflow_${Date.now()}`,
      conceptIds: searchResult.results.map((r) => r.id),
      result: 'partial', // Default status - user hasn't completed yet
      timestamp: new Date().toISOString(),
    });

    // ============================================================================
    // INTERRUPT: Wait for user completion
    // ============================================================================
    const questionId = randomUUID();

    const resumeValue = await interrupt({
      type: 'await_user_input',
      prompt: practicePrompt,
      questionId,
      instruction: 'Complete the practice exercises. Provide detailed answers showing your work.',
    });

    // ============================================================================
    // STEP 8: Extract Answer (after resume)
    // ============================================================================
    const answer = typeof resumeValue === 'string'
      ? resumeValue
      : (resumeValue as any)?.answer ?? (resumeValue as any)?.content ?? '';

    return {
      messages: [
        { role: 'assistant', content: practicePrompt },
        { role: 'user', content: answer }
      ],
      practicePrompt,
      userAnswer: answer,
    };
  }

  // ============================================================================
  // RESUME: Practice already shown and answered
  // ============================================================================
  return state;
};
