/**
 * Practice Subgraph Node: HANDLE_CONVERSATION
 *
 * Handles non-answer user intents during practice:
 * - hint_request: Provides progressive hints
 * - clarification: Clarifies the question
 * - thinking_aloud: Encourages continued thinking
 * - give_up: Reveals answer and marks complete
 * - off_topic: Redirects to the question
 *
 * After handling, interrupts for the next user response.
 */

import { randomUUID } from 'node:crypto';
import { interrupt } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';
import type { UserIntent } from '../types';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';
import { streamLLM } from '../../../utils/stream-llm';

/**
 * Configuration
 */
const MAX_CONVERSATION_TURNS = 5;
const MAX_HINTS = 3;

/**
 * Hint generation prompt - progressive hints from vague to specific
 */
const HINT_GENERATION_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a supportive tutor providing hints for practice questions.
Generate a hint that helps without giving away the answer.

Hint levels:
- Level 1: Very vague, just point in the right direction
- Level 2: More specific, mention relevant concepts
- Level 3: Nearly complete, just needs final step

Be encouraging and maintain the learning experience.`,
  ],
  [
    'user',
    `Question: {question}
Topic: {topic}
Concepts: {concepts}
Hint level: {hintLevel} of 3

Generate a level {hintLevel} hint:`,
  ],
]);

/**
 * Clarification generation prompt
 */
const CLARIFICATION_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a supportive tutor clarifying practice questions.
Rephrase and explain the question in simpler terms.
Add context that helps understanding without giving away the answer.`,
  ],
  [
    'user',
    `Original question: {question}
Topic: {topic}
User's confusion: {userResponse}

Clarify the question:`,
  ],
]);

/**
 * Generate response based on intent
 *
 * Handles both LLM-generated responses (hint, clarification) and static responses.
 * All chunk emission is handled internally via streamLLM for LLM calls or
 * manual emission for static messages.
 */
async function generateResponse(
  deps: WorkflowDeps,
  state: typeof PracticeAnnotation.State,
  intent: UserIntent,
  config: LangGraphRunnableConfig,
  streamMode: boolean | undefined
): Promise<{ message: string; hintsGiven: number; isComplete: boolean }> {
  const practice = state.practice!;
  const question = practice.currentQuestion || state.practicePrompt || '';
  const model = await deps.providerFactory.getModel();
  const emitter = createChunkEmitter(config);

  switch (intent) {
  case 'hint_request': {
    const newHintsGiven = practice.hintsGiven + 1;

    if (newHintsGiven > MAX_HINTS) {
      const staticMessage =
        "I've given you all the hints I can! Try your best answer, or say 'give up' to see the solution.";
      // Emit static message
      const messageId = generateId('msg');
      emitter.textStart(messageId);
      emitter.textDelta(messageId, staticMessage);
      emitter.textEnd(messageId);
      return {
        message: staticMessage,
        hintsGiven: practice.hintsGiven,
        isComplete: false,
      };
    }

    const messages = await HINT_GENERATION_TEMPLATE.formatMessages({
      question,
      topic: state.topic,
      concepts: practice.focusConcepts.join(', '),
      hintLevel: String(newHintsGiven),
    });

    const hint = await streamLLM({ model, messages, config, streamMode });

    return {
      message: `**Hint ${newHintsGiven}/${MAX_HINTS}:**\n\n${hint}\n\nWhat's your answer?`,
      hintsGiven: newHintsGiven,
      isComplete: false,
    };
  }

  case 'clarification': {
    const messages = await CLARIFICATION_TEMPLATE.formatMessages({
      question,
      topic: state.topic,
      userResponse: state.userAnswer ?? 'general confusion',
    });

    const clarification = await streamLLM({ model, messages, config, streamMode });

    return {
      message: `${clarification}\n\nDoes that help? What's your answer?`,
      hintsGiven: practice.hintsGiven,
      isComplete: false,
    };
  }

  case 'thinking_aloud': {
    const staticMessage =
      "Great thinking! Take your time. When you're ready, share your answer. You can also ask for a hint if you'd like.";
    // Emit static message
    const messageId = generateId('msg');
    emitter.textStart(messageId);
    emitter.textDelta(messageId, staticMessage);
    emitter.textEnd(messageId);
    return {
      message: staticMessage,
      hintsGiven: practice.hintsGiven,
      isComplete: false,
    };
  }

  case 'give_up': {
    const giveUpMessage = `No worries! Here's a helpful explanation:\n\n` +
        `The key concepts to understand are: **${practice.focusConcepts.join(', ')}**.\n\n` +
        `Let's move on to the next practice!`;
    // Emit static message
    const messageId = generateId('msg');
    emitter.textStart(messageId);
    emitter.textDelta(messageId, giveUpMessage);
    emitter.textEnd(messageId);
    return {
      message: giveUpMessage,
      hintsGiven: practice.hintsGiven,
      isComplete: true,
    };
  }

  case 'off_topic': {
    const staticMessage = `Let's focus on the question:\n\n"${question}"\n\nWhat's your answer?`;
    // Emit static message
    const messageId = generateId('msg');
    emitter.textStart(messageId);
    emitter.textDelta(messageId, staticMessage);
    emitter.textEnd(messageId);
    return {
      message: staticMessage,
      hintsGiven: practice.hintsGiven,
      isComplete: false,
    };
  }

  default: {
    const staticMessage = "I didn't quite catch that. What's your answer to the question?";
    // Emit static message
    const messageId = generateId('msg');
    emitter.textStart(messageId);
    emitter.textDelta(messageId, staticMessage);
    emitter.textEnd(messageId);
    return {
      message: staticMessage,
      hintsGiven: practice.hintsGiven,
      isComplete: false,
    };
  }
  }
}

/**
 * Handle Conversation Node
 *
 * Processes non-answer intents and continues the practice dialogue.
 */
export const handleConversationNode =
  (deps: WorkflowDeps) =>
    async (state: typeof PracticeAnnotation.State, config: LangGraphRunnableConfig) => {
      const emitter = createChunkEmitter(config);
      const startTime = Date.now();
      const practice = state.practice!;
      const intent = practice.userIntent ?? 'off_topic';
      const newTurns = practice.conversationTurns + 1;
      const streamMode = config.configurable?.llmStreamMode as boolean | undefined;

      deps.loggerService.debug('handleConversationNode: start', {
        intent,
        conversationTurns: newTurns,
        hintsGiven: practice.hintsGiven,
      });

      // Safety: max turns reached
      if (newTurns >= MAX_CONVERSATION_TURNS) {
        const maxTurnsMessage =
        "We've had quite a conversation! Let's see your best answer now, or say 'give up' to move on.";

        const messageId = generateId('msg');
        emitter.textStart(messageId);
        emitter.textDelta(messageId, maxTurnsMessage);
        emitter.textEnd(messageId);

        // Wait for final attempt
        const resumeValue = await interrupt({
          type: 'practice_final_attempt',
          prompt: maxTurnsMessage,
          questionId: randomUUID(),
        });

        const answer =
        typeof resumeValue === 'string'
          ? resumeValue
          : (resumeValue as { answer?: string })?.answer ?? '';

        return {
          messages: [new AIMessage(maxTurnsMessage)],
          userAnswer: answer,
          practice: {
            conversationTurns: newTurns,
            // Force classification to answer_attempt on next round
            userIntent: undefined,
          },
        };
      }

      // Generate appropriate response based on intent
      // Note: streamLLM handles chunk emission internally, no manual emit needed
      const { message, hintsGiven, isComplete } = await generateResponse(
        deps,
        state,
        intent,
        config,
        streamMode
      );

      // If complete (give up), don't wait for response
      if (isComplete) {
        const duration = Date.now() - startTime;
        deps.loggerService.info('handleConversationNode: user gave up', {
          topic: state.topic,
          conversationTurns: newTurns,
          durationMs: duration,
        });

        return {
          messages: [new AIMessage(message)],
          practice: {
            conversationTurns: newTurns,
            hintsGiven,
            isComplete: true,
          },
        };
      }

      // Wait for next user input
      const resumeValue = await interrupt({
        type: 'practice_followup',
        prompt: message,
        questionId: randomUUID(),
      });

      const answer =
      typeof resumeValue === 'string'
        ? resumeValue
        : (resumeValue as { answer?: string; content?: string })?.answer ??
          (resumeValue as { answer?: string; content?: string })?.content ??
          '';

      const duration = Date.now() - startTime;
      deps.loggerService.info('handleConversationNode: complete', {
        intent,
        conversationTurns: newTurns,
        hintsGiven,
        durationMs: duration,
      });

      return {
        messages: [new AIMessage(message)],
        userAnswer: answer,
        practice: {
          conversationTurns: newTurns,
          hintsGiven,
          userIntent: undefined, // Clear for reclassification
        },
      };
    };
