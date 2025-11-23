import path from 'node:path';

export interface DocumentPreviewSnippet {
  label: string;
  excerpt: string;
  startLine: number;
}

export interface DocumentPreview {
  source: string;
  outline: string[];
  snippets: DocumentPreviewSnippet[];
  stats: {
    charCount: number;
    wordCount: number;
    lineCount: number;
    approxReadingMinutes: number;
    codeBlockCount: number;
    fileExtension?: string;
  };
}

const MAX_AI_SNIPPETS = 4;
const MAX_AI_SNIPPET_LENGTH = 420;
const MIN_SNIPPET_LENGTH = 80;
const MAX_OUTLINE_ITEMS = 12;

const sanitizeForAi = (text: string) =>
  text.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_AI_SNIPPET_LENGTH);

const detectHeadingLabel = (line: string): string | null => {
  if (!line) {
    return null;
  }

  const markdownHeading = line.match(/^#{1,6}\s+(.*)$/);
  if (markdownHeading) {
    return markdownHeading[1].trim();
  }

  const declarationHeading = line.match(
    /^(?:export\s+)?(?:class|function|interface|type)\s+[A-Za-z0-9_]+/i,
  );
  if (declarationHeading) {
    return declarationHeading[0].trim();
  }

  const labelHeading = line.match(/^[A-Z][A-Za-z0-9\s]{3,}:/);
  if (labelHeading) {
    return labelHeading[0].replace(/:$/, '').trim();
  }

  return null;
};

const buildSectionsFromContent = (lines: string[]) => {
  type Section = { label: string; startLine: number; buffer: string[] };
  const sections: Array<{ label: string; startLine: number; content: string }> = [];
  let current: Section = { label: 'Introduction', startLine: 1, buffer: [] };
  let insideCodeBlock = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      insideCodeBlock = !insideCodeBlock;
    }

    const heading = !insideCodeBlock ? detectHeadingLabel(trimmed) : null;
    if (heading) {
      if (current.buffer.length) {
        sections.push({
          label: current.label,
          startLine: current.startLine,
          content: current.buffer.join('\n'),
        });
      }
      current = {
        label: heading,
        startLine: index + 1,
        buffer: [],
      };
    }

    current.buffer.push(line);
  });

  if (current.buffer.length) {
    sections.push({
      label: current.label,
      startLine: current.startLine,
      content: current.buffer.join('\n'),
    });
  }

  return sections;
};

const buildFallbackSegments = (content: string): DocumentPreviewSnippet[] => {
  const paragraphs = content.split(/\n{2,}/).map((chunk) => sanitizeForAi(chunk));
  let filtered = paragraphs
    .filter((chunk) => chunk.length >= MIN_SNIPPET_LENGTH)
    .slice(0, MAX_AI_SNIPPETS)
    .map((chunk, index) => ({
      label: `Segment ${index + 1}`,
      excerpt: chunk,
      startLine: index * 5 + 1,
    }));

  if (!filtered.length && content.trim()) {
    filtered = [
      {
        label: 'Segment 1',
        excerpt: sanitizeForAi(content),
        startLine: 1,
      },
    ];
  }

  return filtered;
};

const selectSnippetsFromSections = (
  sections: Array<{ label: string; content: string; startLine: number }>,
  rawContent: string,
): DocumentPreviewSnippet[] => {
  const scored = sections
    .map((section) => ({
      label: section.label || `Section ${section.startLine}`,
      startLine: section.startLine,
      excerpt: sanitizeForAi(section.content),
      score: section.content.length,
    }))
    .filter((section) => section.excerpt.length >= MIN_SNIPPET_LENGTH)
    .sort((a, b) => b.score - a.score);

  const snippets: DocumentPreviewSnippet[] = [];
  const usedLabels = new Set<string>();

  for (const section of scored) {
    if (snippets.length >= MAX_AI_SNIPPETS) {
      break;
    }
    const labelKey = section.label.toLowerCase();
    if (usedLabels.has(labelKey)) {
      continue;
    }
    usedLabels.add(labelKey);
    snippets.push({
      label: section.label,
      excerpt: section.excerpt,
      startLine: section.startLine,
    });
  }

  if (snippets.length === 0) {
    return buildFallbackSegments(rawContent);
  }

  if (snippets.length < MAX_AI_SNIPPETS) {
    const fallbackSegments = buildFallbackSegments(rawContent);
    for (const segment of fallbackSegments) {
      if (snippets.length >= MAX_AI_SNIPPETS) {
        break;
      }
      const duplicateLabel = snippets.find((snippet) => snippet.label === segment.label);
      if (!duplicateLabel) {
        snippets.push(segment);
      }
    }
  }

  return snippets;
};

export const createPreparsedMaterial = (
  rawContent: string,
  options?: { filePath?: string; sourceLabel?: string },
): DocumentPreview => {
  const safeContent = rawContent ?? '';
  const lines = safeContent.split(/\r?\n/);
  const sections = buildSectionsFromContent(lines);
  const snippets = selectSnippetsFromSections(sections, safeContent);

  const headings = sections
    .map((section) => section.label)
    .filter((label, index, array) => label && array.indexOf(label) === index)
    .slice(0, MAX_OUTLINE_ITEMS);

  const wordCount = safeContent.trim() ? safeContent.trim().split(/\s+/).length : 0;
  const codeBlockCount = (safeContent.match(/```[\s\S]*?```/g) ?? []).length;

  return {
    source: options?.filePath || options?.sourceLabel || 'content',
    outline: headings,
    snippets,
    stats: {
      charCount: safeContent.length,
      wordCount,
      lineCount: lines.length,
      approxReadingMinutes: Math.max(1, Math.round(wordCount / 220)),
      codeBlockCount,
      fileExtension: options?.filePath ? path.extname(options.filePath) : undefined,
    },
  };
};

export const previewToPromptPayload = (preview: DocumentPreview): string =>
  JSON.stringify(
    {
      source: preview.source,
      stats: preview.stats,
      outline: preview.outline,
      snippets: preview.snippets,
    },
    null,
    2,
  );
