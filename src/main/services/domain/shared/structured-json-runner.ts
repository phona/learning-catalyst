import type { ModelConfig } from '../../ai/ai-types';
import type { ILogger } from '../../types';
import type { AiService } from '@/main/services/ai/ai-service';
import type { DomainAgent } from '@/main/services/agent/domain-agent';

const normalizeJsonText = (raw: string) => {
  const trimmed = raw?.trim() ?? '';
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
};

const tryParseJson = <T>(text: string): T | undefined => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
};

const parseJsonPayload = <T>(raw: string): T => {
  const normalized = normalizeJsonText(raw);
  const direct = tryParseJson<T>(normalized);
  if (direct !== undefined) {
    return direct;
  }

  const sliceBetween = (text: string, startChar: '{' | '[', endChar: '}' | ']') => {
    const start = text.indexOf(startChar);
    const end = text.lastIndexOf(endChar);
    if (start !== -1 && end !== -1 && end >= start) {
      return text.slice(start, end + 1);
    }
    return null;
  };

  const objectSlice = sliceBetween(normalized, '{', '}');
  if (objectSlice) {
    const parsed = tryParseJson<T>(objectSlice);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  const arraySlice = sliceBetween(normalized, '[', ']');
  if (arraySlice) {
    const parsed = tryParseJson<T>(arraySlice);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  throw new Error('Unable to parse JSON payload');
};

export interface StructuredJsonRunnerDeps {
  aiService: AiService;
  domainAgent: DomainAgent;
  logger: ILogger;
  modelConfig: ModelConfig;
}

export interface StructuredJsonRequest<T> {
  systemPrompt: string;
  input: string;
  fallbackPrompt?: string;
  fallback: T;
  context: string;
}

export const createStructuredJsonRunner = ({
  aiService,
  domainAgent,
  logger,
  modelConfig
}: StructuredJsonRunnerDeps) => {
  const runAiJson = async <T>(prompt: string, fallback: T, context: string): Promise<T> => {
    try {
      const response = await aiService.chatCompletion({
        messages: [
          { role: 'system', content: 'You are an AI assistant that only returns valid JSON.' },
          { role: 'user', content: prompt }
        ],
        modelConfig
      });

      const raw = response.content?.trim();
      if (!raw) {
        throw new Error('Empty AI response');
      }

      return parseJsonPayload<T>(raw);
    } catch (error) {
      logger.warn('AI structured JSON fallback failed', { context, error });
      return fallback;
    }
  };

  // Primary path: run through LangChain so the service benefits from agents, tools,
  // and any provider-side fallbacks configured inside LangChain itself.
  const runAgentJson = async <T>(systemPrompt: string, input: string, context: string): Promise<T> => {
    const response = await domainAgent.run({
      conversationId: context,
      topic: undefined,
      userId: undefined,
      messages: [{ role: 'user', content: input }],
      systemPrompt
    });
    const raw = response.content?.trim();
    if (!raw) {
      throw new Error('Empty agent response');
    }
    return parseJsonPayload<T>(raw);
  };

  // Public helper wraps the domain agent attempt with a deterministic fallback.
  // We keep this layer so that:
  //  1. IPC responses always retain their documented shape (renderer never sees a failure).
  //  2. We can log domain-specific telemetry when the agent fails.
  //  3. Legacy services that still depend on aiService-only flows get a consistent safety net.
  const runStructuredJson = async <T>({
    systemPrompt,
    input,
    fallbackPrompt,
    fallback,
    context
  }: StructuredJsonRequest<T>): Promise<T> => {
    try {
      return await runAgentJson<T>(systemPrompt, input, context);
    } catch (error) {
      logger.warn('Domain agent execution failed, using aiService fallback', { context, error });
      const prompt = fallbackPrompt ?? `${systemPrompt}\n${input}`;
      return runAiJson(prompt, fallback, context);
    }
  };

  return {
    runStructuredJson
  };
};
