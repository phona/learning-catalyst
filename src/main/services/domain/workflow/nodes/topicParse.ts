import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';

export const topicParseNode = (deps: WorkflowDeps) => async (state: typeof WorkflowStateAnnotation.State) => {
  const messages = state.messages ?? [];
  const lastUserMsg = [...messages].reverse().find((m: any) => (m?.lc_kwargs?.role ?? m?.role ?? 'assistant') === 'user');
  const raw = lastUserMsg?.content ?? lastUserMsg?.lc_kwargs?.content ?? state.topic ?? '';
  const text = String(raw ?? '').normalize('NFKC').trim();
  const prompt = text;

  if (!prompt) {
    const msg = { role: 'assistant', content: 'No topic provided. Please specify what you want to learn about.' };
    return { messages: [msg], topic: '' };
  }

  try {
    const result = await deps.knowledgeService.findRelatedByPrompt(prompt, {
      limit: 10,
      threshold: 0.6,
    });

    const conceptMatches = result.matches.filter((m) => m.type === 'concept');
    const top = conceptMatches[0];

    if (!top) {
      const msg = { role: 'assistant', content: 'No matching concepts found. Try importing learning materials or rephrasing your question.' };
      return { messages: [msg], topic: prompt };
    }

    const relationshipMatches = result.matches.filter((m) => m.type === 'relationship');
    const neighbors = relationshipMatches.slice(0, 3).map((m) => m.name);

    const msgText = neighbors.length
      ? `Topic: ${top.name}. Related: ${neighbors.join(', ')}`
      : `Topic: ${top.name}`;

    return {
      messages: [{ role: 'assistant', content: msgText }],
      topic: top.name,
    };
  } catch (error) {
    const msg = {
      role: 'assistant',
      content: `Failed to parse topic: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return { messages: [msg], topic: prompt };
  }
};
