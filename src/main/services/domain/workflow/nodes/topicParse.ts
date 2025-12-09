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
    return { messages: [new AIMessage('No topic provided. Please specify what you want to learn about.')], topic: '' };
  }

  try {
    const result = await deps.knowledgeService.findRelatedByPrompt(prompt, {
      limit: 10,
      threshold: 0.6,
    });

    const conceptMatches = result.matches.filter((m) => m.type === 'concept');
    const top = conceptMatches[0];

    if (!top) {
      return { messages: [new AIMessage('No matching concepts found. Try importing learning materials or rephrasing your question.')], topic: prompt };
    }

    const relationshipMatches = result.matches.filter((m) => m.type === 'relationship');
    const neighbors = relationshipMatches.slice(0, 3).map((m) => m.name);

    const msgText = neighbors.length
      ? `Topic: ${top.name}. Related: ${neighbors.join(', ')}`
      : `Topic: ${top.name}`;

    return {
      messages: [new AIMessage(msgText)],
      topic: top.name,
    };
  } catch (error) {
    return {
      messages: [new AIMessage(`Failed to parse topic: ${error instanceof Error ? error.message : 'Unknown error'}`)],
      topic: prompt,
    };
  }
};
