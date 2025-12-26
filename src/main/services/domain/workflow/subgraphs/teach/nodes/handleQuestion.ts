/**
 * Teach Subgraph Node: HANDLE_QUESTION
 *
 * Handles user questions and confusion during teaching:
 * - question: Answers the user's question
 * - confused: Provides clarification
 * - off_topic: Redirects to the topic
 *
 * After handling, interrupts for the next user response.
 */

import { interrupt } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { TeachAnnotation } from '../state';
import type { TeachIntent } from '../types';
import { createChunkEmitter, generateId } from '../../../utils/chunk-emitter';

/**
 * Configuration
 */
const MAX_QUESTIONS = 10;

/**
 * Question response prompt template
 */
const QUESTION_RESPONSE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a supportive tutor answering student questions.

Your approach:
- Be concise but thorough
- Use examples to illustrate points
- Connect answers back to the main topic
- Check understanding after answering

Knowledge context:
{knowledgeContext}`,
  ],
  [
    'user',
    `Topic: {topic}
Student's question/concern: "{userQuestion}"

Respond helpfully and end by checking if they have more questions or are ready to practice.`,
  ],
]);

/**
 * Clarification prompt for confused users
 */
const CLARIFICATION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a supportive tutor helping a confused student.

Your approach:
- Acknowledge their confusion
- Rephrase concepts in simpler terms
- Use analogies and concrete examples
- Break down complex ideas into smaller parts
- Be patient and encouraging`,
  ],
  [
    'user',
    `Topic: {topic}
Student's confusion: "{userConfusion}"

Help clarify and end by checking if things are clearer now.`,
  ],
]);

/**
 * Gather knowledge context for response
 */
async function gatherKnowledgeContext(
  deps: WorkflowDeps,
  topic: string
): Promise<string> {
  try {
    const result = await deps.knowledgeService.searchKnowledge({
      query: topic,
      limit: 2,
    });

    if (result.results.length === 0) {
      return 'No specific context available.';
    }

    return result.results
      .map((r) => `- ${r.title}: ${r.preview}`)
      .join('\n');
  } catch {
    return 'No specific context available.';
  }
}

/**
 * Generate response based on intent
 */
async function generateResponse(
  deps: WorkflowDeps,
  state: typeof TeachAnnotation.State,
  intent: TeachIntent
): Promise<string> {
  const model = await deps.providerFactory.getModel();
  const userInput = state.userAnswer ?? '';

  switch (intent) {
  case 'question': {
    const knowledgeContext = await gatherKnowledgeContext(deps, state.topic);
    const messages = await QUESTION_RESPONSE_PROMPT.formatMessages({
      topic: state.topic,
      userQuestion: userInput,
      knowledgeContext,
    });
    const response = await model.invoke(messages);
    return String(response.content ?? '');
  }

  case 'confused': {
    const messages = await CLARIFICATION_PROMPT.formatMessages({
      topic: state.topic,
      userConfusion: userInput,
    });
    const response = await model.invoke(messages);
    return String(response.content ?? '');
  }

  case 'off_topic': {
    return (
      `Let's stay focused on ${state.topic}. ` +
        `What would you like to know about it? Or are you ready to practice?`
    );
  }

  default: {
    return (
      `I'm not sure I understood that. ` +
        `Do you have a question about ${state.topic}, or are you ready to practice?`
    );
  }
  }
}

/**
 * Handle Question Node
 *
 * Processes questions and confusion, then waits for next response.
 */
export const handleQuestionNode =
  (deps: WorkflowDeps) =>
    async (state: typeof TeachAnnotation.State, config: LangGraphRunnableConfig) => {
      const emitter = config.writer ? createChunkEmitter(config) : null;
      const startTime = Date.now();
      const teach = state.teach!;
      const intent = teach.teachIntent ?? 'question';
      const newQuestionsAsked = teach.questionsAsked + 1;

      deps.loggerService.debug('teach:handleQuestion start', {
        intent,
        questionsAsked: newQuestionsAsked,
      });

      // Safety: max questions reached
      if (newQuestionsAsked >= MAX_QUESTIONS) {
        const maxQuestionsMessage =
        `We've covered a lot of ground! Let's consolidate what we've learned. ` +
        `Do you feel ready to try some practice, or would you like a summary?`;

        const messageId = generateId('msg');
        if (emitter) {
          emitter.textStart(messageId);
          emitter.textDelta(messageId, maxQuestionsMessage);
          emitter.textEnd(messageId);
        }

        const resumeValue = await interrupt({
          type: 'teach_max_questions',
          prompt: maxQuestionsMessage,
        });

        const answer =
        typeof resumeValue === 'string'
          ? resumeValue
          : (resumeValue as { answer?: string })?.answer ?? '';

        return {
          messages: [new AIMessage(maxQuestionsMessage), new HumanMessage(answer)],
          userAnswer: answer,
          teach: {
            questionsAsked: newQuestionsAsked,
            teachIntent: undefined,
          },
        };
      }

      // Generate appropriate response based on intent
      const responseContent = await generateResponse(deps, state, intent);

      // Emit to UI
      const messageId = generateId('msg');
      if (emitter) {
        emitter.textStart(messageId);
        emitter.textDelta(messageId, responseContent);
        emitter.textEnd(messageId);
      }

      const duration = Date.now() - startTime;
      deps.loggerService.info('teach:handleQuestion complete', {
        intent,
        questionsAsked: newQuestionsAsked,
        durationMs: duration,
      });

      // Interrupt and wait for next user response
      // Only call interrupt if in a graph context
      const resumeValue = await interrupt({
        type: 'teach_followup',
        prompt: responseContent,
        questionsAsked: newQuestionsAsked,
      });

      const answer =
      typeof resumeValue === 'string'
        ? resumeValue
        : (resumeValue as { answer?: string; content?: string })?.answer ??
          (resumeValue as { answer?: string; content?: string })?.content ??
          '';

      return {
        messages: [new AIMessage(responseContent), new HumanMessage(answer)],
        userAnswer: answer,
        teach: {
          questionsAsked: newQuestionsAsked,
          teachIntent: undefined, // Clear for reclassification
        },
      };
    };
