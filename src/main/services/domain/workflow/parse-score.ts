export const parseScore = (text?: string | null): number | undefined => {
  if (!text) return undefined;
  // Match percentage format with % symbol (e.g., "85%", "85 %")
  const pctMatch = /(\d{1,3})\s*%/.exec(text);
  if (pctMatch) {
    const v = Number(pctMatch[1]);
    if (!Number.isNaN(v)) return Math.min(1, Math.max(0, v / 100));
  }
  // Match "percent" word format (e.g., "75 percent", "75percent")
  const percentWordMatch = /(\d{1,3})\s*percent\b/i.exec(text);
  if (percentWordMatch) {
    const v = Number(percentWordMatch[1]);
    if (!Number.isNaN(v)) return Math.min(1, Math.max(0, v / 100));
  }
  // Match decimal format after score/confidence (e.g., "Score: 0.85")
  const numMatch = /(?:score|confidence|mastery|result)[:\s]*([0-9]+(?:\.[0-9]+)?)/i.exec(text);
  if (numMatch) {
    const v = Number(numMatch[1]);
    if (!Number.isNaN(v)) {
      // If value is already in 0-1 range (decimal), use as-is; otherwise divide by 100
      if (v <= 1) {
        return Math.min(1, Math.max(0, v));
      }
      return Math.min(1, Math.max(0, v / 100));
    }
  }
  return undefined;
};
