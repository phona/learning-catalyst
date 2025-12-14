import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

export const topicParseNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const messages = state.messages ?? [];
  const lastUserMsg = [...messages].reverse().find((m) => m instanceof HumanMessage);
  const raw = lastUserMsg?.content ?? state.topic ?? '';
  const text = String(raw ?? '').normalize('NFKC').trim();
  const prompt = text;

  if (!prompt) {
    return {
      error: 'No topic provided. Please specify what you want to learn about.',
    };
  }

  try {
    const result = await deps.knowledgeService.findRelatedByPrompt(prompt, {
      limit: 10,
      threshold: 0.6,
    });

    // No matching concepts - topic not in our knowledge base, can't proceed
    if (result.matches.length === 0 || !result.matches[0]) {
      console.log(`[TopicParse] No concept matches found for query: "${prompt}"`);
      return {
        messages: [new AIMessage(`Topic "${prompt}" not found in knowledge base. Please try importing learning materials or choose a different topic.`)],
        topic: undefined,  // Don't set topic - will cause workflow to stop
      };
    }

    const top = result.matches[0];

    // Get neighbor concepts (skip the first match which is the main topic)
    const neighbors = result.matches
      .slice(1, 4)
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => m.name);

    const msgText = neighbors.length
      ? `Topic: ${top.name}. Related: ${neighbors.join(', ')}`
      : `Topic: ${top.name}`;

    return {
      messages: [new AIMessage(msgText)],
      topic: top.name,
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

    const errorInfo = error instanceof Error
      ? `${error.message}\n${error.stack}`
      : JSON.stringify(error);
    console.error(`[TopicParse] Error: ${errorInfo}`);
    return {
      error: `Failed to parse topic: ${errorMessage}`,
    };
  }
};
