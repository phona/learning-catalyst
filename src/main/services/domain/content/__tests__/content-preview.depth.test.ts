import { describe, it, expect } from 'vitest';
import { createPreparsedMaterial } from '../../content/content-preview';

describe('content-preview depth', () => {
  const md = [
    '# Title',
    'Intro',
    '## Section A',
    'Details A',
    '### Sub A1',
    'Deep A1',
    '## Section B',
    'Details B',
  ].join('\n');

  it('includes headings up to depth 2', () => {
    const preview = createPreparsedMaterial(md, { sourceLabel: 'md', maxHeadingDepth: 2 });
    expect(preview.outline).toContain('Title');
    expect(preview.outline).toContain('Section A');
    expect(preview.outline).toContain('Section B');
    expect(preview.outline).not.toContain('Sub A1');
  });

  it('includes only H1 when depth is 1', () => {
    const preview = createPreparsedMaterial(md, { sourceLabel: 'md', maxHeadingDepth: 1 });
    expect(preview.outline).toContain('Title');
    expect(preview.outline).not.toContain('Section A');
    expect(preview.outline).not.toContain('Section B');
    expect(preview.outline).not.toContain('Sub A1');
  });
});

