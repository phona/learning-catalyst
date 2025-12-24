// Freeze the object at runtime to prevent modification across tests
export const THRESHOLDS = {
  CONFIDENCE_FAST_TRACK: 0.75,
  MASTERY_COMPLETE: 0.9,
  MASTERY_PASS: 0.85,
  BREAKER_ATTEMPTS: 3,
} as const;

// Apply runtime freeze separately (cannot use as const with Object.freeze)
Object.freeze(THRESHOLDS);
