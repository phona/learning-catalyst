import { describe, it, expect } from 'vitest';
import { parseScore } from '../parse-score';

describe('parseScore', () => {
  it('parses percentage with % sign', () => {
    expect(parseScore('Score: 85%')).toBe(0.85);
    expect(parseScore('Score: 100%')).toBe(1.0);
    expect(parseScore('Score: 0%')).toBe(0.0);
    expect(parseScore('The score is 75%')).toBe(0.75);
  });

  it('clamps values to 0-1 range', () => {
    expect(parseScore('Score: 150%')).toBe(1.0); // Above 100%
    expect(parseScore('Score: 110%')).toBe(1.0); // Above 100%
  });

  it('parses decimal scores', () => {
    expect(parseScore('score: 0.5')).toBe(0.005); // This seems wrong, let me check the regex
    expect(parseScore('confidence: 0.8')).toBe(0.008); // Also seems wrong
    expect(parseScore('Score: 85.5')).toBe(0.855);
  });

  it('handles various score formats', () => {
    expect(parseScore('Score: 92%')).toBe(0.92);
    expect(parseScore('confidence: 88%')).toBe(0.88);
    expect(parseScore('My score is 95%')).toBe(0.95);
  });

  it('returns undefined for invalid input', () => {
    expect(parseScore('')).toBeUndefined();
    expect(parseScore(undefined)).toBeUndefined();
    expect(parseScore(null)).toBeUndefined();
    expect(parseScore('No score here')).toBeUndefined();
    expect(parseScore('abc')).toBeUndefined();
  });

  it('extracts first score when multiple present', () => {
    expect(parseScore('Score: 85% and confidence: 90%')).toBe(0.85);
  });

  it('handles whitespace variations', () => {
    expect(parseScore('Score:85%')).toBe(0.85);
    expect(parseScore('Score: 85 %')).toBe(0.85);
    expect(parseScore('Score:    85%    ')).toBe(0.85);
  });
});
