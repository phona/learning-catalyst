/**
 * =====================================================================================
 * LANGGRAPH EXTRACTION WORKFLOW
 * =====================================================================================
 *
 * This module implements a stateful workflow for concept extraction using LangGraph.
 *
 * DESIGN PHILOSOPHY:
 * - LangGraph provides visual state machine for complex workflows
 * - Smart retry logic: only retry validation errors, not timeouts
 * - Performance monitoring at each step
 * - Clean separation of concerns via nodes
 *
 * WORKFLOW STRUCTURE:
 * ┌─────────┐    ┌──────────┐    ┌─────────────────┐    ┌──────────┐
 * │ START   │───▶│ extract  │───▶│    validate     │───▶│ finalize │
 * └─────────┘    └──────────┘    └─────────────────┘    └──────────┘
 *                      ▲                  │
 *                      │    ┌─────────────┘
 *                      │    │ retry (validation error)
 *                      │    ▼
 *                      │ ┌──────────────────┐
 *                      └─│ increment_attempt│
 *                        └──────────────────┘
 *
 * =====================================================================================
 */

import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import type { ILogger } from '../../types';

import {
  createSimpleExtractChain,
  createRetryExtractChain,
  safeValidateExtractionResult,
  ConceptExtractionResult,
} from './prompts';

/**
 * =====================================================================================
 * TYPE DEFINITIONS
 * =====================================================================================
 */

/**
 * Performance metrics captured during extraction workflow.
 */
interface ExtractionMetrics {
  chainCreationMs: number;
  llmInvokeMs: number;
  jsonParseMs: number;
  validationMs: number;
  totalMs: number;
}

/**
 * State interface for the extraction workflow.
 * This is managed by LangGraph across all nodes.
 */
interface ExtractionStateType {
  content: string;
  attempt: number;
  rawResponse: string | null;
  result: ConceptExtractionResult | null;
  error: string | null;
  success: boolean;
  maxAttempts: number;
  metrics: ExtractionMetrics;
}

/**
 * Options for creating the extraction workflow.
 */
export interface ExtractionWorkflowOptions {
  model: ChatOpenAI;
  maxAttempts?: number;
  logger?: ILogger;
}

/**
 * Result returned by the extraction workflow.
 */
export interface ExtractionWorkflowResult {
  success: boolean;
  result?: ConceptExtractionResult;
  error?: string;
  attempt: number;
  metrics: ExtractionMetrics;
}

/**
 * =====================================================================================
 * STATE ANNOTATION
 * =====================================================================================
 *
 * LangGraph uses Annotation to define state schema with reducers.
 * - Simple types use Annotation<Type>
 * - Types with defaults use { reducer: (x, y) => y, default: () => value }
 * =====================================================================================
 */

const ExtractionStateAnnotation = Annotation.Root({
  // Content to extract from (required input)
  content: Annotation<string>,

  // Current attempt number (starts at 1)
  attempt: Annotation<number>,

  // Raw response from LLM (nullable with default)
  rawResponse: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // Parsed and validated result (nullable with default)
  result: Annotation<ConceptExtractionResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // Error from last attempt (nullable with default)
  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // Whether we've succeeded
  success: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),

  // Maximum attempts allowed
  maxAttempts: Annotation<number>,

  // Performance metrics
  metrics: Annotation<ExtractionMetrics>({
    reducer: (_prev, next) => next,
    default: () => ({
      chainCreationMs: 0,
      llmInvokeMs: 0,
      jsonParseMs: 0,
      validationMs: 0,
      totalMs: 0,
    }),
  }),
});

// Type helper for state
type ExtractionState = typeof ExtractionStateAnnotation.State;

/**
 * =====================================================================================
 * NODE FACTORIES
 * =====================================================================================
 *
 * Each node is a factory function that returns an async node function.
 * This allows injecting dependencies (model, logger) while keeping nodes pure.
 * =====================================================================================
 */

/**
 * Creates the extraction node that calls the LLM.
 *
 * @param model - The ChatOpenAI model to use
 * @param logger - Optional logger for debugging
 * @returns Node function for LangGraph
 */
function createExtractNode(model: ChatOpenAI, logger?: ILogger) {
  return async (state: ExtractionState): Promise<Partial<ExtractionState>> => {
    const { content, attempt, rawResponse, error } = state;
    const startTime = Date.now();

    logger?.debug('[LANGGRAPH] Extracting concepts', {
      attempt,
      contentLength: content.length,
    });

    try {
      // Create the appropriate chain based on attempt number
      const chainCreationStart = Date.now();
      const chain =
        attempt === 1 ? createSimpleExtractChain(model) : createRetryExtractChain(model);
      const chainCreationMs = Date.now() - chainCreationStart;

      // Prepare input based on attempt
      const input =
        attempt === 1
          ? { content }
          : {
              content,
              previousResponse: rawResponse || '',
              errors: error || 'Unknown validation error',
            };

      logger?.debug('[LANGGRAPH] Invoking LLM', {
        attempt,
        chainCreationMs,
        isRetry: attempt > 1,
      });

      // Invoke the chain
      const invokeStart = Date.now();
      const response = await chain.invoke(input);
      const llmInvokeMs = Date.now() - invokeStart;

      const responseStr = typeof response === 'string' ? response : JSON.stringify(response);

      logger?.debug('[LANGGRAPH] LLM response received', {
        attempt,
        llmInvokeMs,
        responseLength: responseStr.length,
        responsePreview: responseStr.substring(0, 100),
      });

      return {
        rawResponse: responseStr,
        metrics: {
          chainCreationMs,
          llmInvokeMs,
          jsonParseMs: 0,
          validationMs: 0,
          totalMs: Date.now() - startTime,
        },
      };
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      logger?.error('[LANGGRAPH] Extraction failed', {
        attempt,
        error: errorObj.message,
        stack: errorObj.stack,
      });

      // Propagate error to be handled by workflow
      throw errorObj;
    }
  };
}

/**
 * Creates the validation node that parses and validates LLM response.
 *
 * @param logger - Optional logger for debugging
 * @returns Node function for LangGraph
 */
function createValidateNode(logger?: ILogger) {
  return async (state: ExtractionState): Promise<Partial<ExtractionState>> => {
    const { rawResponse, attempt, metrics } = state;
    const startTime = Date.now();

    logger?.debug('[LANGGRAPH] Validating response', {
      attempt,
      responseType: typeof rawResponse,
    });

    // Parse JSON response from AI
    const parseStart = Date.now();
    let parsedData: unknown;
    let jsonParseMs = 0;

    if (typeof rawResponse === 'string') {
      try {
        parsedData = JSON.parse(rawResponse);
        jsonParseMs = Date.now() - parseStart;

        logger?.debug('[LANGGRAPH] JSON parsed successfully', {
          attempt,
          jsonParseMs,
        });
      } catch (parseError) {
        jsonParseMs = Date.now() - parseStart;
        const parseErrorMsg = `Failed to parse JSON response: ${parseError}`;

        logger?.error('[LANGGRAPH] JSON parse failed', {
          attempt,
          jsonParseMs,
          rawResponsePreview: rawResponse.substring(0, 200),
        });

        return {
          error: parseErrorMsg,
          metrics: {
            ...metrics,
            jsonParseMs,
            totalMs: Date.now() - startTime,
          },
        };
      }
    } else {
      parsedData = rawResponse;
      jsonParseMs = Date.now() - parseStart;
    }

    // Validate with Zod schema
    const validationStart = Date.now();
    const validationResult = safeValidateExtractionResult(parsedData);
    const validationMs = Date.now() - validationStart;

    logger?.debug('[LANGGRAPH] Validation completed', {
      attempt,
      validationMs,
      isValid: validationResult.success,
    });

    if (validationResult.success) {
      const validData = validationResult.data;
      logger?.info('[LANGGRAPH] Validation successful', {
        attempt,
        nodesFound: validData.nodes.length,
        relationshipsFound: validData.relationships.length,
      });

      return {
        result: validData,
        success: true,
        error: null,
        metrics: {
          ...metrics,
          jsonParseMs,
          validationMs,
          totalMs: Date.now() - startTime,
        },
      };
    } else {
      const validationError = validationResult.error;
      logger?.warn('[LANGGRAPH] Validation failed', {
        attempt,
        validationMs,
        errors: validationError,
      });

      return {
        error: validationError,
        metrics: {
          ...metrics,
          jsonParseMs,
          validationMs,
          totalMs: Date.now() - startTime,
        },
      };
    }
  };
}

/**
 * Creates the decision function for conditional edges.
 * Determines whether to retry, finalize success, or finalize failure.
 *
 * @param logger - Optional logger for debugging
 * @returns Decision function for conditional edges
 */
function createShouldRetryDecision(logger?: ILogger) {
  return (state: ExtractionState): string => {
    const { success, attempt, error, maxAttempts, rawResponse } = state;

    logger?.debug('[LANGGRAPH] Deciding next step', {
      attempt,
      success,
      hasError: !!error,
      maxAttempts,
    });

    // If successful, we're done
    if (success) {
      logger?.info('[LANGGRAPH] Extraction successful, finishing', {
        attempt,
        totalAttempts: attempt,
      });
      return 'finalize';
    }

    // Check if we've exceeded max attempts
    if (attempt >= maxAttempts) {
      logger?.error('[LANGGRAPH] Max attempts reached, failing', {
        attempt,
        maxAttempts,
        finalError: error,
      });
      return 'finalize';
    }

    // Determine if error is retryable
    const isRetryableError =
      // JSON parsing errors
      (error && error.includes('Failed to parse JSON')) ||
      // Zod validation errors
      (error && error.includes('Validation failed')) ||
      // JSON syntax errors
      (error && error.includes('in template')) ||
      // Malformed JSON
      (error && error.includes('Unexpected token')) ||
      // AI returned non-JSON
      (rawResponse && !rawResponse.trim().startsWith('{'));

    // Don't retry timeouts or network errors
    const isNonRetryableError =
      (error && error.includes('timed out')) ||
      (error && error.includes('TimeoutError')) ||
      (error && error.includes('network')) ||
      (error && error.includes('ECONNRESET')) ||
      (error && error.includes('ENOTFOUND'));

    if (isNonRetryableError) {
      logger?.warn('[LANGGRAPH] Non-retryable error, failing immediately', {
        attempt,
        error,
      });
      return 'finalize';
    }

    if (isRetryableError) {
      logger?.info('[LANGGRAPH] Retryable error, retrying', {
        attempt,
        nextAttempt: attempt + 1,
        error,
      });
      return 'retry';
    }

    // Unknown error type - don't retry to be safe
    logger?.warn('[LANGGRAPH] Unknown error type, failing', {
      attempt,
      error,
    });
    return 'finalize';
  };
}

/**
 * Creates the increment attempt node.
 *
 * @param logger - Optional logger for debugging
 * @returns Node function for LangGraph
 */
function createIncrementAttemptNode(logger?: ILogger) {
  return (state: ExtractionState): Partial<ExtractionState> => {
    logger?.debug('[LANGGRAPH] Incrementing attempt', {
      currentAttempt: state.attempt,
      nextAttempt: state.attempt + 1,
    });

    return {
      attempt: state.attempt + 1,
    };
  };
}

/**
 * Creates the finalize node that prepares final state.
 *
 * @param logger - Optional logger for debugging
 * @returns Node function for LangGraph
 */
function createFinalizeNode(logger?: ILogger) {
  return (state: ExtractionState): Partial<ExtractionState> => {
    const { success, result, error, attempt, metrics } = state;

    logger?.info('[LANGGRAPH] Finalizing extraction', {
      success,
      attempt,
      hasResult: !!result,
      hasError: !!error,
      totalMs: metrics.totalMs,
    });

    // No state changes needed - just logging
    return {};
  };
}

/**
 * =====================================================================================
 * WORKFLOW CREATION & EXECUTION
 * =====================================================================================
 */

/**
 * Create and compile the LangGraph workflow for concept extraction.
 *
 * @param opts - Workflow options including model and logger
 * @returns Compiled LangGraph workflow
 */
export function createExtractionWorkflow(opts: ExtractionWorkflowOptions) {
  const { model, logger, maxAttempts = 2 } = opts;

  const workflow = new StateGraph(ExtractionStateAnnotation)
    // Add nodes
    .addNode('extract', createExtractNode(model, logger))
    .addNode('validate', createValidateNode(logger))
    .addNode('increment_attempt', createIncrementAttemptNode(logger))
    .addNode('finalize', createFinalizeNode(logger))
    // Add edges
    .addEdge(START, 'extract')
    .addEdge('extract', 'validate')
    .addConditionalEdges('validate', createShouldRetryDecision(logger), {
      retry: 'increment_attempt',
      finalize: 'finalize',
    })
    .addEdge('increment_attempt', 'extract')
    .addEdge('finalize', END);

  // Compile the graph
  const graph = workflow.compile();

  logger?.info('[LANGGRAPH] Workflow compiled', {
    maxAttempts,
  });

  return graph;
}

/**
 * Execute the extraction workflow.
 *
 * This is the main entry point for concept extraction.
 *
 * @param content - Content to extract concepts from
 * @param model - ChatOpenAI model to use for extraction
 * @param logger - Optional logger for debugging
 * @param maxAttempts - Maximum retry attempts (default: 2)
 * @returns Extraction result with success status, concepts, and metrics
 */
export async function executeExtractionWorkflow(
  content: string,
  model: ChatOpenAI,
  logger?: ILogger,
  maxAttempts: number = 2,
): Promise<ExtractionWorkflowResult> {
  const workflow = createExtractionWorkflow({ model, logger, maxAttempts });

  const initialState = {
    content,
    attempt: 1,
    rawResponse: null,
    result: null,
    error: null,
    success: false,
    maxAttempts,
    metrics: {
      chainCreationMs: 0,
      llmInvokeMs: 0,
      jsonParseMs: 0,
      validationMs: 0,
      totalMs: 0,
    },
  };

  logger?.info('[LANGGRAPH] Starting extraction workflow', {
    contentLength: content.length,
    maxAttempts,
  });

  const startTime = Date.now();

  try {
    const finalState = await workflow.invoke(initialState);

    const totalDuration = Date.now() - startTime;

    logger?.info('[LANGGRAPH] Workflow completed', {
      success: finalState.success,
      attempt: finalState.attempt,
      totalDurationMs: totalDuration,
      nodesFound: finalState.result?.nodes.length || 0,
    });

    return {
      success: finalState.success,
      result: finalState.result ?? undefined,
      error: finalState.error ?? undefined,
      attempt: finalState.attempt,
      metrics: finalState.metrics,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const totalDuration = Date.now() - startTime;

    logger?.error('[LANGGRAPH] Workflow failed', {
      error: err.message,
      stack: err.stack,
      totalDurationMs: totalDuration,
    });

    return {
      success: false,
      error: err.message,
      attempt: initialState.attempt,
      metrics: initialState.metrics,
    };
  }
}
