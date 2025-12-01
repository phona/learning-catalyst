import { describe, it, expect } from 'vitest';
import { createPreparsedMaterial } from '../../content/content-preview';

describe('content-preview markdown setext and code fences', () => {
  it('handles Setext headings and depth gates them', () => {
    const md = [
      'Main Title',
      '===========',
      '',
      'Section',
      '--------',
      '',
      '### Deep',
      'body',
    ].join('\n');
    const preview = createPreparsedMaterial(md, { sourceLabel: 'md', maxHeadingDepth: 2 });
    expect(preview.outline).toContain('Main Title');
    expect(preview.outline).toContain('Section');
    expect(preview.outline).not.toContain('Deep');
  });

  it('ignores headings inside fenced code blocks', () => {
    const md = [
      '# Title',
      '',
      '```',
      '## Not a heading',
      '```',
      '',
      '## Real Heading',
      'text',
    ].join('\n');
    const preview = createPreparsedMaterial(md, { sourceLabel: 'md', maxHeadingDepth: 2 });
    expect(preview.outline).toContain('Title');
    expect(preview.outline).toContain('Real Heading');
    expect(preview.outline).not.toContain('Not a heading');
  });

  it('gates mixed ATX and Setext headings at max depth', () => {
    const md = [
      '# Title',
      '',
      'Section',
      '--------',
      '',
      '## Sub',
      '',
      'Subsection',
      '----------',
      '',
      '### Deep',
      'text',
    ].join('\n');
    const preview = createPreparsedMaterial(md, { sourceLabel: 'md', maxHeadingDepth: 2 });
    expect(preview.outline).toContain('Title');
    expect(preview.outline).toContain('Section');
    expect(preview.outline).toContain('Sub');
    expect(preview.outline).not.toContain('Deep');
  });
});
