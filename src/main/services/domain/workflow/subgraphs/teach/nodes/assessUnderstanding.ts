/**
 * Teach Subgraph Node: ASSESS_UNDERSTANDING
 *
 * Evaluates user's understanding when they indicate readiness.
 * Determines if mastered or identifies gaps for further teaching.
 *
 * This node does NOT interrupt - it returns assessment results
 * and the graph routing decides next step.
 */

import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { TeachAnnotation } from '../state';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';

/**
 * Mastery threshold
 */
const MASTERY_THRESHOLD = 0.75;

/**
 * Assessment prompt template
 */
const ASSESSMENT_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert learning assessor evaluating student understanding.

Analyze the conversation to assess comprehension. Consider:
- Quality of questions asked (shows engagement)
- Understanding shown in responses
- Ability to relate concepts
- Any remaining confusion

Return ONLY valid JSON:
{
  "level": 0.0-1.0,
  "gaps": ["concept needing more work", "another gap"],
  "mastered": boolean,
  "reason": "brief explanation of assessment"
}

Scoring guide:
- 0.0-0.3: Major misconceptions, fundamental confusion
- 0.4-0.6: Partial understanding, several gaps
- 0.7-0.8: Good grasp, minor clarifications needed
- 0.9-1.0: Excellent mastery, ready for practice`,
  ],
  [
    'user',
    `Topic: {topic}

Conversation summary:
{conversationSummary}

User's final statement indicating readiness: "{userStatement}"

Teaching rounds completed: {rounds}
Questions asked by user: {questionsAsked}

Assess their understanding:`,
  ],
]);

/**
 * Assessment result interface
 */
interface AssessmentResult {
  level: number;
  gaps: string[];
  mastered: boolean;
  reason: string;
}

/**
 * Parse assessment from AI response
 */
function parseAssessment(content: string): AssessmentResult {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        level: Math.max(0, Math.min(1, Number(parsed.level) || 0.5)),
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        mastered: Boolean(parsed.mastered),
        reason: String(parsed.reason || 'Assessment complete'),
      };
    }
  } catch {
    // Fallback for parse errors
  }

  return {
    level: 0.6,
    gaps: [],
    mastered: false,
    reason: 'Could not parse assessment, defaulting to moderate understanding',
  };
}

/**
 * Summarize conversation for assessment
 */
function summarizeConversation(
  messages: typeof TeachAnnotation.State['messages']
): string {
  if (!messages || messages.length === 0) {
    return 'No conversation recorded.';
  }

  // Take last 8 messages for context
  const recent = messages.slice(-8);

  return recent
    .map((m) => {
      const role = m instanceof AIMessage ? 'Assistant' : 'User';
      const content = String(m.content ?? '').slice(0, 300);
      return `${role}: ${content}${String(m.content ?? '').length > 300 ? '...' : ''}`;
    })
    .join('\n\n');
}

/**
 * Assess Understanding Node
 *
 * Evaluates comprehension and determines if user has mastered the topic.
 */
export const assessUnderstandingNode =
  (deps: WorkflowDeps) =>
    async (state: typeof TeachAnnotation.State, config: LangGraphRunnableConfig) => {
      const emitter = createChunkEmitter(config);
      const startTime = Date.now();
      const teach = state.teach!;

      deps.loggerService.debug('teach:assessUnderstanding start', {
        topic: state.topic,
        round: teach.teachingRound,
        previousLevel: teach.understandingLevel,
        questionsAsked: teach.questionsAsked,
      });

      // Summarize conversation for assessment
      const conversationSummary = summarizeConversation(state.messages);

      // Format assessment prompt
      const messages = await ASSESSMENT_PROMPT.formatMessages({
        topic: state.topic,
        conversationSummary,
        userStatement: state.userAnswer ?? 'I understand',
        rounds: String(teach.teachingRound),
        questionsAsked: String(teach.questionsAsked),
      });

      // Get assessment from LLM
      const model = await deps.providerFactory.getModel();
      const response = await model.invoke(messages);
      const assessment = parseAssessment(String(response.content ?? ''));

      // Determine mastery (use threshold)
      const mastered = assessment.level >= MASTERY_THRESHOLD && assessment.gaps.length === 0;

      const duration = Date.now() - startTime;
      deps.loggerService.info('teach:assessUnderstanding complete', {
        level: assessment.level,
        gaps: assessment.gaps,
        mastered,
        reason: assessment.reason,
        durationMs: duration,
      });

      // Emit feedback to UI
      let feedbackMessage: string;
      if (mastered) {
        feedbackMessage =
        `🎉 Excellent! You've demonstrated a solid understanding of ${state.topic}. ` +
        `You're ready to put your knowledge into practice!`;
      } else if (assessment.gaps.length > 0) {
        feedbackMessage =
        `You're making good progress! Let's strengthen your understanding of: ` +
        `${assessment.gaps.join(', ')}. Then we'll move to practice.`;
      } else {
        feedbackMessage =
        `Good effort! Let's explore ${state.topic} a bit more to solidify your understanding.`;
      }

      const messageId = generateId('msg');
      emitter.textStart(messageId);
      emitter.textDelta(messageId, feedbackMessage);
      emitter.textEnd(messageId);

      return {
        messages: [new AIMessage(feedbackMessage)],
        teach: {
          understandingLevel: assessment.level,
          gaps: assessment.gaps,
          mastered,
          assessmentReason: assessment.reason,
        },
      };
    };
