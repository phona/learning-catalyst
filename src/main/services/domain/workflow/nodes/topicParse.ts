import type { WorkflowDeps } from '../state';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createChunkEmitter, generateId } from '../utils/chunk-emitter';
import { NodeName } from '../types';

export const topicParseNode =
  (deps: WorkflowDeps) =>
  async (state: typeof WorkflowStateAnnotation.State, config: LangGraphRunnableConfig) => {
    const emitter = createChunkEmitter(config);
    const nodeName = NodeName.TOPIC_PARSE;
    const toolCallId = generateId(nodeName);
    emitter.toolInputStart(toolCallId, nodeName);

    const messages = state.messages ?? [];
    const lastUserMsg = [...messages].reverse().find((m) => m instanceof HumanMessage);
    const raw = lastUserMsg?.content ?? state.topic ?? '';
    const text = String(raw ?? '')
      .normalize('NFKC')
      .trim();
    const prompt = text;

    emitter.toolInputAvailable(toolCallId, nodeName, {
      prompt,
      hasTopic: !!prompt,
    });

    if (!prompt) {
      const errorMessage = 'No topic provided. Please specify what you want to learn about.';
      emitter.toolOutputAvailable(toolCallId, {
        ok: false,
        error: { message: errorMessage },
      });
      return {
        error: errorMessage,
      };
    }

    const result = await deps.knowledgeService.findRelatedByPrompt(prompt, {
      limit: 10,
      threshold: 0.6,
    });

    // No matching concepts - topic not in our knowledge base, can't proceed
    if (result.matches.length === 0 || !result.matches[0]) {
      console.log(`[TopicParse] No concept matches found for query: "${prompt}"`);
      const errorMessage = `Topic "${prompt}" not found in knowledge base.`;
      emitter.toolOutputAvailable(toolCallId, {
        ok: false,
        error: { message: errorMessage },
      });
      return {
        error: errorMessage,
        topic: undefined, // Don't set topic - will cause workflow to stop
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

    emitter.toolOutputAvailable(toolCallId, {
      ok: true,
      data: {
        topic: top.name,
        neighbors,
        msgText,
      },
    });

    return {
      messages: [new AIMessage(msgText)],
      topic: top.name,
    };
  };
