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

    console.log(`[TopicParse] Query: "${prompt}"`);
    console.log(`[TopicParse] Total matches: ${result.matches.length}, Concept matches: ${conceptMatches.length}`);

    if (result.matches.length > 0) {
      console.log(`[TopicParse] Found matches:`, result.matches.map(m => ({
        type: m.type,
        name: m.name,
        score: m.score
      })));
    }

    if (!top) {
      console.log(`[TopicParse] No concept matches found for query: "${prompt}"`);
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
      messages: [new AIMessage(`Failed to parse topic: ${errorMessage}`)],
      topic: prompt,
    };
  }
};
