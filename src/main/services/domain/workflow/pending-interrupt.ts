import { INTERRUPT } from '@langchain/langgraph';
import type { CheckpointPendingWrite, CheckpointTuple } from '@langchain/langgraph-checkpoint';

type CheckpointTupleLike = Pick<CheckpointTuple, 'checkpoint' | 'pendingWrites'> | null | undefined;

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

function extractInterruptPrompt(interruptValue: unknown): string | undefined {
  if (Array.isArray(interruptValue) && interruptValue.length > 0) {
    const last = interruptValue[interruptValue.length - 1];
    if (isRecord(last) && 'value' in last) {
      return extractPromptish(last.value ?? last);
    }
    return extractPromptish(last);
  }
  return extractPromptish(interruptValue);
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

export function getPendingInterruptPrompt(checkpointTuple: CheckpointTupleLike): string | undefined {
  const channelValues = checkpointTuple?.checkpoint?.channel_values;

  const interruptFromChannel = extractInterruptPrompt(channelValues?.[INTERRUPT]);
  if (interruptFromChannel) return interruptFromChannel;

  const pendingInterruptValue = getLatestInterruptWrite(checkpointTuple?.pendingWrites)?.[2];
  return extractInterruptPrompt(pendingInterruptValue);
}
