import { INTERRUPT } from '@langchain/langgraph';
import type { CheckpointPendingWrite, CheckpointTuple } from '@langchain/langgraph-checkpoint';

type CheckpointTupleLike = Pick<CheckpointTuple, 'checkpoint' | 'pendingWrites'> | null | undefined;

type InterruptDetails = {
  prompt: string;
  reasoning?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function extractPromptish(value: unknown, depth = 0): string | undefined {
  // Guard against weird self-referential shapes (shouldn't happen, but keep it safe).
  if (depth > 4) return undefined;
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return undefined;

  const candidate = value.prompt ?? value.content ?? value.question;

  if (typeof candidate === 'string') return candidate;
  if (candidate == null) {
    // Common persisted LangGraph interrupt shape in SQLite:
    //   { id: "...", value: { type: "...", prompt: "..." } }
    if ('value' in value) {
      const nested = extractPromptish(value.value, depth + 1);
      if (nested) return nested;
    }
    return undefined;
  }

  try {
    return JSON.stringify(candidate);
  } catch {
    return String(candidate);
  }
}

function extractInterruptDetails(interruptValue: unknown): InterruptDetails | undefined {
  const normalize = (value: unknown): InterruptDetails | undefined => {
    if (!isRecord(value)) {
      const prompt = extractPromptish(value);
      return prompt ? { prompt } : undefined;
    }

    const prompt = extractPromptish(value);
    let reasoning =
      typeof value.reasoning === 'string'
        ? value.reasoning
        : typeof value.reasoning_content === 'string'
          ? value.reasoning_content
          : undefined;

    if (!reasoning && 'value' in value && isRecord(value.value)) {
      const nested = value.value;
      reasoning =
        typeof nested.reasoning === 'string'
          ? nested.reasoning
          : typeof nested.reasoning_content === 'string'
            ? nested.reasoning_content
            : undefined;
    }

    if (!prompt) return undefined;
    return reasoning ? { prompt, reasoning } : { prompt };
  };

  if (Array.isArray(interruptValue) && interruptValue.length > 0) {
    const last = interruptValue[interruptValue.length - 1];
    if (isRecord(last) && 'value' in last) {
      return normalize(last.value ?? last);
    }
    return normalize(last);
  }

  return normalize(interruptValue);
}

const getLatestInterruptWrite = (
  pendingWrites: ReadonlyArray<CheckpointPendingWrite> | undefined,
): CheckpointPendingWrite | undefined =>
  pendingWrites?.filter(([, channel]) => channel === INTERRUPT).at(-1);

export function hasPendingInterrupt(checkpointTuple: CheckpointTupleLike): boolean {
  const channelValues = checkpointTuple?.checkpoint?.channel_values;

  const interruptChannelValue = channelValues?.[INTERRUPT];
  if (Array.isArray(interruptChannelValue) && interruptChannelValue.length > 0) {
    return true;
  }

  return !!getLatestInterruptWrite(checkpointTuple?.pendingWrites);
}

export function getPendingInterruptDetails(
  checkpointTuple: CheckpointTupleLike,
): InterruptDetails | undefined {
  const channelValues = checkpointTuple?.checkpoint?.channel_values;

  const interruptFromChannel = extractInterruptDetails(channelValues?.[INTERRUPT]);
  if (interruptFromChannel) return interruptFromChannel;

  const pendingInterruptValue = getLatestInterruptWrite(checkpointTuple?.pendingWrites)?.[2];
  return extractInterruptDetails(pendingInterruptValue);
}

export function getPendingInterruptPrompt(checkpointTuple: CheckpointTupleLike): string | undefined {
  return getPendingInterruptDetails(checkpointTuple)?.prompt;
}
