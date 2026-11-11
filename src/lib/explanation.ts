/** The first sentence, which leads the Why block, and everything after it. */
export function splitExplanation(text: string): { lead: string; rest: string } {
  const trimmed = text.trim();
  const match = /^(.+?[.!?])(?:\s+([\s\S]*))?$/.exec(trimmed);
  if (!match) return { lead: trimmed, rest: '' };
  return { lead: match[1], rest: (match[2] ?? '').trim() };
}
