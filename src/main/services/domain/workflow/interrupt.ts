export type InterruptEvent = { __interrupt__?: Array<{ value?: unknown; checkpoint_id?: string }> };

export const isInterruptEvent = (evt: unknown): evt is InterruptEvent =>
  !!(evt as InterruptEvent)?.__interrupt__?.length;

export const extractInterrupt = (
  evt: InterruptEvent,
): Record<string, unknown> | unknown | undefined => {
  const raw = evt?.__interrupt__?.[0];
  return raw?.value ?? raw;
};
