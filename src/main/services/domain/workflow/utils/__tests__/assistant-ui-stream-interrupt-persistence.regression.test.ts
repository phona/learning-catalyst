import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { toAssistantUIStream } from '../assistant-ui-stream';
import { isInterruptEvent } from '../../interrupt';

type StreamEvent = [string, unknown];

function makeCancelSensitiveInterruptStream() {
  const state = {
    cancelled: false,
    interruptPersisted: false,
    returnsCalled: 0,
    nextCalls: 0,
  };

  let step = 0;

  const iterator: AsyncIterator<StreamEvent> & AsyncIterable<StreamEvent> = {
    [Symbol.asyncIterator]() {
      return this;
    },

    async next() {
      state.nextCalls += 1;

      if (step === 0) {
        step += 1;
        return {
          done: false,
          value: ['custom', { type: 'text-start', id: 'msg-1' }],
        };
      }

      if (step === 1) {
        step += 1;

        // Model: interrupt observed, then a checkpoint persistence happens shortly after.
        // If the stream gets cancelled immediately, treat it as "persistence didn't complete".
        setTimeout(() => {
          if (!state.cancelled) state.interruptPersisted = true;
        }, 0);

        return {
          done: false,
          value: [
            'updates',
            {
              __interrupt__: [{ value: { type: 'teach_response' }, checkpoint_id: 'cp-1' }],
            },
          ],
        };
      }

      // Simulate a stream that would otherwise keep running / waiting for resume.
      await new Promise(() => {});
      return { done: true, value: undefined as unknown as StreamEvent };
    },

    async return() {
      state.returnsCalled += 1;
      state.cancelled = true;
      return { done: true, value: undefined as unknown as StreamEvent };
    },
  };

  return { stream: iterator, state };
}

describe('toAssistantUIStream interrupt persistence (regression)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('evidence: early-return consumption cancels upstream before post-interrupt persistence', async () => {
    const { stream, state } = makeCancelSensitiveInterruptStream();

    // This local adapter mirrors the old pattern:
    // `for await (...) { if (isInterruptEvent) return }`
    // Returning from a `for await` loop calls `iterator.return()` on the upstream async iterator.
    async function* legacyAdapter(workflowStream: AsyncIterable<StreamEvent>) {
      for await (const [eventType, data] of workflowStream) {
        if (eventType !== 'custom' && isInterruptEvent(data)) return;
      }
    }

    for await (const _ of legacyAdapter(stream)) {
      // consume until it stops on interrupt
    }

    // Do NOT advance timers: the 0ms persistence timer should not run once cancelled.
    expect(state.returnsCalled).toBe(1);
    expect(state.interruptPersisted).toBe(false);
  });

  it('reproduces the current bug: toAssistantUIStream stops on interrupt before persistence completes', async () => {
    const { stream, state } = makeCancelSensitiveInterruptStream();

    for await (const _chunk of toAssistantUIStream(stream)) {
      // consume until adapter stops at interrupt
    }

    await vi.runOnlyPendingTimersAsync();

    // BUG EVIDENCE: persistence did not complete even though we processed pending timers.
    expect(state.returnsCalled).toBe(1);
    expect(state.interruptPersisted).toBe(false);
  });

  it.skip('expected behavior: does not cancel upstream synchronously on interrupt', async () => {
    const { stream, state } = makeCancelSensitiveInterruptStream();

    for await (const _chunk of toAssistantUIStream(stream)) {
      // consume
    }

    // Desired: adapter ends the turn stream but does not immediately cancel the upstream iterator,
    // so the workflow/checkpointer can finish its post-interrupt persistence.
    expect(state.returnsCalled).toBe(0);
  });

  it.skip('expected behavior: toAssistantUIStream allows post-interrupt persistence to complete', async () => {
    const { stream, state } = makeCancelSensitiveInterruptStream();

    for await (const _chunk of toAssistantUIStream(stream)) {
      // consume
    }

    await vi.runOnlyPendingTimersAsync();
    expect(state.interruptPersisted).toBe(true);
  });
});
