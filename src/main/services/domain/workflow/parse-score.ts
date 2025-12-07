export const parseScore = (text?: string | null): number | undefined => {
  if (!text) return undefined;
  const pctMatch = /(\d{1,3})\s*%/.exec(text);
  if (pctMatch) {
    const v = Number(pctMatch[1]);
    if (!Number.isNaN(v)) return Math.min(1, Math.max(0, v / 100));
  }
  const numMatch = /(?:score|confidence)[:\s]*([0-9]+(?:\.[0-9]+)?)/i.exec(text);
  if (numMatch) {
    const v = Number(numMatch[1]);
    if (!Number.isNaN(v)) return Math.min(1, Math.max(0, v / 100));
  }
  return undefined;
};
