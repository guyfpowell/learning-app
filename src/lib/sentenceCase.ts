/**
 * A button label in sentence case: the first letter is a capital, and later Title-Case words are
 * lower-cased. All-caps words (acronyms) are kept. A proper noun in a label would be lower-cased,
 * so write such a label in the sentence case it should have.
 */
export function sentenceCase(label: string): string {
  const lowered = label.replace(/\b[A-Z][a-z]+\b/g, (word) => word.toLowerCase());
  return lowered.replace(/\p{L}/u, (first) => first.toUpperCase());
}
