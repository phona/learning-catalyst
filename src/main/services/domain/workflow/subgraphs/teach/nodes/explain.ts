/**
 * Teach Subgraph Node: EXPLAIN
 *
 * Generates teaching content based on:
 * - Initial explanation (first round)
 * - Gap-focused explanation (subsequent rounds)
 * - Deeper dive (when user wants more)
 *
 * After generating content, interrupts to wait for user response.
 */

import { interrupt } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { TeachAnnotation } from '../state';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';

/**
 * Teaching prompt template with knowledge context
 */
const TEACHING_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a supportive and engaging learning assistant.

Your role:
- Explain concepts clearly with examples and analogies
- If gaps are provided, focus specifically on those areas
- Break complex topics into digestible parts
- Use real-world applications to make concepts relatable
- End with a question to check understanding or invite questions

Knowledge context:
{knowledgeContext}`,
  ],
  [
    'human',
    `Topic: {topic}
Teaching round: {round}

{instruction}

Provide a clear, engaging explanation. End by asking if they have questions or feel ready to practice.`,
  ],
]);

/**
 * Gather knowledge context for teaching
 */
async function gatherKnowledgeContext(
  deps: WorkflowDeps,
  topic: string
): Promise<string> {
  try {
    const result = await deps.knowledgeService.searchKnowledge({
      query: topic,
      limit: 3,
    });

    if (result.results.length === 0) {
      return 'No specific context available.';
    }

    return result.results
      .map((r) => `- ${r.title}: ${r.preview}`)
      .join('\n');
  } catch (error) {
    deps.loggerService.warn('Failed to gather knowledge context', { error });
    return 'No specific context available.';
  }
}

/**
 * Build instruction based on teaching context
 */
function buildInstruction(round: number, gaps: string[]): string {
  if (round === 1) {
    return 'Provide an initial explanation of this topic. Start with the fundamentals and build understanding progressively.';
  }

  if (gaps.length > 0) {
    return `The learner needs help with these concepts: ${gaps.join(', ')}. Focus your explanation on clarifying these areas.`;
  }

  return 'Provide a deeper explanation building on what was discussed. Explore more advanced aspects or related concepts.';
}

/**
 * Explain Node
 *
 * Generates teaching content and waits for user response.
 */
export const explainNode =
  (deps: WorkflowDeps) =>
  async (state: typeof TeachAnnotation.State, config: LangGraphRunnableConfig) => {
    const emitter = createChunkEmitter(config);
    const teach = state.teach!;
    const round = teach.teachingRound + 1;

    deps.loggerService.debug('teach:explain start', {
      topic: state.topic,
      round,
      gaps: teach.gaps,
    });

    // Gather knowledge context
    const knowledgeContext = await gatherKnowledgeContext(deps, state.topic);

    // Build instruction based on context
    const instruction = buildInstruction(round, teach.gaps);

    // Format prompt
    const messages = await TEACHING_PROMPT.formatMessages({
      topic: state.topic,
      round: String(round),
      instruction,
      knowledgeContext,
    });

    // Get LLM response
    const model = await deps.providerFactory.getModel();
    const response = await model.invoke(messages);
    const content = String(response.content ?? '');

    // Emit to UI
    const messageId = generateId('msg');
    emitter.textStart(messageId);
    emitter.textDelta(messageId, content);
    emitter.textEnd(messageId);

    deps.loggerService.info('teach:explain complete', {
      topic: state.topic,
      round,
      contentLength: content.length,
    });

    // Interrupt and wait for user response
    const resumeValue = await interrupt({
      type: 'teach_response',
      prompt: content,
      round,
    });

    // Extract user answer from resume value
    const userAnswer =
      typeof resumeValue === 'string'
        ? resumeValue
        : (resumeValue as { answer?: string; content?: string })?.answer ??
          (resumeValue as { answer?: string; content?: string })?.content ??
          '';

    return {
      messages: [new AIMessage(content)],
      userAnswer,
      teach: {
        teachingRound: round,
        gaps: [], // Clear after addressing
        teachIntent: undefined, // Clear for classification
      },
    };
  };
