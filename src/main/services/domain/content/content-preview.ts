import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

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

type DetectedHeading = { label: string; level: number } | null;

const detectHeading = (line: string): DetectedHeading => {
  if (!line) {
    return null;
  }

  const markdownHeading = line.match(/^#{1,6}\s+(.*)$/);
  if (markdownHeading) {
    const hashes = (line.match(/^#{1,6}/) || [''])[0].length;
    return { label: markdownHeading[1].trim(), level: hashes };
  }

  const declarationHeading = line.match(
    /^(?:export\s+)?(?:class|function|interface|type)\s+[A-Za-z0-9_]+/i,
  );
  if (declarationHeading) {
    return { label: declarationHeading[0].trim(), level: 2 };
  }

  const labelHeading = line.match(/^[A-Z][A-Za-z0-9\s]{3,}:/);
  if (labelHeading) {
    return { label: labelHeading[0].replace(/:$/, '').trim(), level: 2 };
  }

  return null;
};

export const extractMarkdownHeadings = (
  content: string,
): Array<{ label: string; level: number; startLine: number }> => {
  const tree = unified().use(remarkParse).parse(content) as any;
  const result: Array<{ label: string; level: number; startLine: number }> = [];
  const stack: any[] = [tree];
  while (stack.length) {
    const node = stack.pop();
    if (node && node.type === 'heading' && node.depth && node.position?.start?.line) {
      const parts: string[] = [];
      const children = Array.isArray(node.children) ? node.children : [];
      for (const c of children) {
        if (typeof c.value === 'string') parts.push(c.value);
        else if (Array.isArray(c.children)) {
          for (const cc of c.children) {
            if (typeof cc.value === 'string') parts.push(cc.value);
          }
        }
      }
      const label = parts.join('').trim();
      result.push({ label, level: node.depth, startLine: node.position.start.line });
    }
    const children = Array.isArray(node?.children) ? node.children : [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push(children[i]);
    }
  }
  return result.sort((a, b) => a.startLine - b.startLine);
};

const buildSectionsFromContent = (lines: string[], maxDepth?: number) => {
  type Section = { label: string; startLine: number; buffer: string[] };
  const sections: Array<{ label: string; startLine: number; content: string }> = [];
  let current: Section = { label: 'Introduction', startLine: 1, buffer: [] };
  let insideCodeBlock = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      insideCodeBlock = !insideCodeBlock;
    }

    const heading = !insideCodeBlock ? detectHeading(trimmed) : null;
    const withinDepth = heading && (!maxDepth || heading.level <= Math.max(1, Math.min(6, maxDepth)));
    if (heading && withinDepth) {
      if (current.buffer.length) {
        sections.push({
          label: current.label,
          startLine: current.startLine,
          content: current.buffer.join('\n'),
        });
      }
      current = {
        label: heading.label,
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

const buildSectionsFromHeadings = (
  lines: string[],
  headings: Array<{ label: string; level: number; startLine: number }>,
  maxDepth?: number,
) => {
  const sections: Array<{ label: string; startLine: number; content: string }> = [];
  const depth = maxDepth ? Math.max(1, Math.min(6, maxDepth)) : undefined;
  const included = headings.filter((h) => (depth === undefined ? true : h.level <= depth));
  if (!included.length) {
    return buildSectionsFromContent(lines, maxDepth);
  }
  let currentLabel = 'Introduction';
  let currentStart = 1;
  for (const h of included) {
    const end = h.startLine - 1;
    const prev = lines.slice(currentStart - 1, Math.max(currentStart - 1, end)).join('\n');
    if (prev.trim().length) {
      sections.push({ label: currentLabel, startLine: currentStart, content: prev });
    }
    currentLabel = h.label;
    currentStart = h.startLine;
  }
  const tail = lines.slice(currentStart - 1).join('\n');
  if (tail.trim().length) {
    sections.push({ label: currentLabel, startLine: currentStart, content: tail });
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
  options?: { filePath?: string; sourceLabel?: string; maxHeadingDepth?: number },
): DocumentPreview => {
  const safeContent = rawContent ?? '';
  const lines = safeContent.split(/\r?\n/);
  const mdHeadings = extractMarkdownHeadings(safeContent);
  const sections = mdHeadings.length
    ? buildSectionsFromHeadings(lines, mdHeadings, options?.maxHeadingDepth)
    : buildSectionsFromContent(lines, options?.maxHeadingDepth);
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
  JSON.stringify({
    source: preview.source,
    stats: preview.stats,
    outline: preview.outline,
    snippets: preview.snippets,
  });
