const EM_DASH = /\s*—\s*/g;
const ONLY_DASHES = /^[\s—]+$/;

/** A head this short, with no sentence end in it, is a title or a lead-in: "Title — what it covers". */
const TITLE_HEAD_MAX = 60;

/**
 * Words that start a new thought after a dash ("Great work — your path is done", "Here's what I have —
 * tell me if it is wrong"), so the dash becomes a full stop and not a colon.
 */
const NEW_THOUGHT_STARTERS = new Set([
  'i', "i'm", "i've", "i'll", "i'd", 'you', "you're", "you've", "you'll", 'your', 'we', "we're", "we've", "we'll",
  'it', "it's", 'that', "that's", 'this', "this's", 'there', "there's", 'they', "they're", 'he', 'she', 'our',
  'tell', 'keep', 'try', 'let', 'see', 'check', 'ask', 'start', 'pick', 'choose', 'remember', 'note', "don't", 'do', 'no',
]);

const firstWord = (s: string) => s.trimStart().split(/[\s,;:.!?]/, 1)[0]?.toLowerCase() ?? '';
const capitalise = (s: string) => s.replace(/\p{L}/u, (c) => c.toUpperCase());
const endsSentence = (s: string) => /[.!?]["')\]]*$/.test(s.trimEnd());

/** One em dash in a short, single-clause text: a title and what it covers, or two thoughts. */
function joinOne(head: string, tail: string): string {
  const hasSentenceEnd = /[.!?]/.test(head);
  if (NEW_THOUGHT_STARTERS.has(firstWord(tail))) return `${endsSentence(head) ? head : `${head}.`} ${capitalise(tail)}`;
  if (head.length <= TITLE_HEAD_MAX && !hasSentenceEnd && !head.includes(':')) return `${head}: ${tail}`;
  return `${head}, ${tail}`;
}

/**
 * Text with its em dashes replaced, for showing (the stored copy is untouched). The best fit for each:
 * a title and what it covers gets a colon ("The CPO's job: product as a lever"); two thoughts get a full stop
 * ("Great work. Your path is done."); everything else, such as an aside between two dashes or a long
 * sentence, gets commas. A line never carries two colons, and no em dash is ever returned.
 */
export function withoutEmDashes(text: string): string {
  if (!text.includes('—')) return text;
  if (ONLY_DASHES.test(text)) return 'n/a';
  const trimmed = text.trim().replace(/^—\s*/, '').replace(/\s*—$/, '');
  const dashes = trimmed.match(EM_DASH)?.length ?? 0;
  if (dashes === 0) return trimmed;
  if (dashes > 1) return trimmed.replace(EM_DASH, ', ');
  const [head = '', tail = ''] = trimmed.split(EM_DASH);
  return joinOne(head, tail);
}
