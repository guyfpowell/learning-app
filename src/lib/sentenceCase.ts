/** Words a label keeps capitalised wherever they fall. */
const PROPER_NOUNS = new Set(['Albert']);

/**
 * A button label in sentence case: the first letter is a capital, and later Title-Case words are
 * lower-cased. All-caps words (acronyms) and the proper nouns in `PROPER_NOUNS` are kept. Any other
 * proper noun in a label would be lower-cased, so add it there.
 */
export function sentenceCase(label: string): string {
  const lowered = label.replace(/\b[A-Z][a-z]+\b/g, (word) => (PROPER_NOUNS.has(word) ? word : word.toLowerCase()));
  return lowered.replace(/\p{L}/u, (first) => first.toUpperCase());
}
