/**
 * Practice Subgraph Node: ASK_QUESTION
 *
 * Generates a practice question and waits for user input.
 * This is the entry point of the practice subgraph.
 *
 * Flow:
 * - Generate question based on topic and knowledge graph
 * - Emit question to user via chunks
 * - Interrupt to wait for user response
 * - Pass response to classifyIntent node
 */

import { randomUUID } from 'node:crypto';
import { interrupt } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { WorkflowDeps } from '../../../state';
import { PracticeAnnotation } from '../state';
import { streamLLM } from '../../../utils/stream-llm';
import { buildInterruptPayload } from '../../../utils/interrupt-payload';
import { createAssistantMessageWithReasoning } from '../../../utils/assistant-message';

/**
 * Configuration constants
 */
const MAX_FOCUS_CONCEPTS = 5;
const MAX_RELATED_CONCEPTS = 6;
const KNOWLEDGE_SEARCH_LIMIT = 6;

/**
 * Question generation prompt template
 */
const QUESTION_GENERATION_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a supportive tutor creating practice questions.
Generate a clear, focused question that tests understanding of the topic.
Include context to help the learner understand what's being asked.
Be encouraging and conversational.`,
  ],
  [
    'user',
    `Create a practice question for the topic.

Topic: {topic}
Key concepts: {focusConcepts}
Related concepts: {relatedConcepts}

Generate:
1. A clear question that tests understanding
2. Brief context if needed
3. Encouraging closing (e.g., "Take your time!" or "Share your thinking!")

End by inviting the user to ask for hints if needed.`,
  ],
]);

/**
 * Ask Question Node
 *
 * Generates a practice question and waits for user response.
 * Handles both fresh starts and resumption from checkpoints.
 */
export const askQuestionNode =
  (deps: WorkflowDeps) =>
    async (state: typeof PracticeAnnotation.State, config: LangGraphRunnableConfig) => {
      const startTime = Date.now();

      deps.loggerService.debug('askQuestionNode: start', {
        topic: state.topic,
        hasPractice: !!state.practice?.currentQuestion,
      });

      // Check if we already have a question (resume case)
      if (state.practice?.currentQuestion && !state.practice.isComplete) {
        deps.loggerService.debug('askQuestionNode: resuming with existing question');

        // Wait for user input on existing question
        const prompt = state.practice.currentQuestion;
        const resumeValue = await interrupt(
          buildInterruptPayload({
            type: 'practice_question',
            prompt,
            questionId: randomUUID(),
          })
        );

        const answer =
        typeof resumeValue === 'string'
          ? resumeValue
          : (resumeValue as { answer?: string; content?: string })?.answer ??
            (resumeValue as { answer?: string; content?: string })?.content ??
            '';

        const lastMessage = state.messages?.[state.messages.length - 1];
        const alreadyHasPrompt =
          !!lastMessage &&
          AIMessage.isInstance(lastMessage) &&
          String((lastMessage as any).content ?? '') === prompt;

        return {
          messages: alreadyHasPrompt
            ? [new HumanMessage(answer)]
            : [new AIMessage(prompt), new HumanMessage(answer)],
          userAnswer: answer,
        };
      }

      // Step 1: Search knowledge graph for relevant concepts
      const searchResult = await deps.knowledgeService.searchKnowledge({
        query: state.topic,
        limit: KNOWLEDGE_SEARCH_LIMIT,
      });

      if (!searchResult.results.length) {
        deps.loggerService.error('askQuestionNode: no knowledge found', { topic: state.topic });
        return {
          error: `No knowledge found for topic: ${state.topic}`,
          practice: { isComplete: true },
        };
      }

      // Extract focus concepts
      const focusConcepts = Array.from(
        new Set(searchResult.results.map((r) => r.title).filter(Boolean))
      ).slice(0, MAX_FOCUS_CONCEPTS);

      // Get related concepts
      const relatedSet = new Set<string>();
      if (searchResult.results[0]?.id) {
        const related = await deps.knowledgeService.getRelatedConcepts(searchResult.results[0].id);
        related.relatedConcepts.forEach((rel) => relatedSet.add(rel.name));
      }
      const relatedConcepts = Array.from(relatedSet).slice(0, MAX_RELATED_CONCEPTS);

      // Step 2: Generate question using AI
      const model = await deps.providerFactory.getModel();
      const messages = await QUESTION_GENERATION_TEMPLATE.formatMessages({
        topic: state.topic,
        focusConcepts: focusConcepts.join(', '),
        relatedConcepts: relatedConcepts.join(', ') || 'None',
      });

      const streamMode = config.configurable?.llmStreamMode as boolean | undefined;
      const { content: questionContent, reasoning } = await streamLLM({
        model,
        messages,
        config,
        streamMode,
      });

      // Step 3: Record analytics
      await deps.practiceService.recordPracticeAttempt({
        taskId: `practice_${Date.now()}`,
        conceptIds: searchResult.results.map((r) => r.id),
        result: 'partial',
        timestamp: new Date().toISOString(),
      });

      // Step 4: Interrupt for user input
      const questionId = randomUUID();
      const resumeValue = await interrupt(
        buildInterruptPayload(
          {
            type: 'practice_question',
            prompt: questionContent,
            questionId,
            instruction: 'Answer the question, or ask for hints/clarification if needed.',
          },
          { reasoning }
        )
      );

      const answer =
      typeof resumeValue === 'string'
        ? resumeValue
        : (resumeValue as { answer?: string; content?: string })?.answer ??
          (resumeValue as { answer?: string; content?: string })?.content ??
          '';

      const duration = Date.now() - startTime;
      deps.loggerService.info('askQuestionNode: complete', {
        topic: state.topic,
        questionLength: questionContent.length,
        durationMs: duration,
      });

      return {
        messages: [
          createAssistantMessageWithReasoning(questionContent, reasoning),
          new HumanMessage(answer),
        ],
        practicePrompt: questionContent,
        userAnswer: answer,
        practice: {
          currentQuestion: questionContent,
          expectedAnswer: '', // Will be used for grading context
          hintsGiven: 0,
          conversationTurns: 0,
          isComplete: false,
          focusConcepts,
          relatedConcepts,
        },
      };
    };
