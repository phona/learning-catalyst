export type ExtractedContent = {
  text?: string;
  reasoning?: string;
};

function extractFromBlocks(blocks: unknown[]): ExtractedContent {
  const textParts: string[] = [];
  const reasoningParts: string[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      continue;
    }

    const type = (block as any).type;
    if (type === 'text' && typeof (block as any).text === 'string') {
      textParts.push((block as any).text as string);
    }
    if (type === 'reasoning' && typeof (block as any).reasoning === 'string') {
      reasoningParts.push((block as any).reasoning as string);
    }
  }

  return {
    ...(textParts.length > 0 ? { text: textParts.join('') } : {}),
    ...(reasoningParts.length > 0 ? { reasoning: reasoningParts.join('') } : {}),
  };
}

export function extractContentParts(rawContent: unknown): ExtractedContent {
  if (typeof rawContent === 'string') {
    return { text: rawContent };
  }

  if (Array.isArray(rawContent)) {
    return extractFromBlocks(rawContent);
  }

  if (rawContent && typeof rawContent === 'object') {
    if ('content' in rawContent) {
      return extractContentParts((rawContent as { content?: unknown }).content);
    }

    if ('type' in rawContent) {
      return extractFromBlocks([rawContent]);
    }
  }

  return {};
}

export function resolveMessageContent(rawContent: unknown, extracted: ExtractedContent): string {
  if (typeof extracted.text === 'string') {
    return extracted.text;
  }

  if (typeof extracted.reasoning === 'string' && extracted.reasoning.length > 0) {
    return '';
  }

  return typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
}
