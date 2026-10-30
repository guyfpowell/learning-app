/**
 * The heading on a quiz result. It rotates, so "Correct!" isn't the same word every time.
 * Wording is app-only for now: the API sends a true/false verdict, and web still says "Correct!".
 */
export const CORRECT_PHRASES: readonly string[] = [
  'Spot on.',
  'Nicely done!',
  'Right on target.',
  'Well played!',
  'Locked in!',
  'Sharp thinking.',
  'Good call.',
  'Nailed it.',
  'Exactly right.',
  "That's the one.",
];

export const INCORRECT_PHRASES: readonly string[] = [
  'Not quite.',
  'Not this time.',
  'Almost there.',
  'Good try.',
  'Worth another look.',
  'One to learn from.',
  'Missed that one.',
  'So close.',
  'Nearly.',
  'Have another go.',
];

// Three passes so the pattern is easy to spot: in order, odd positions then even, then backwards.
const PASSES = 3;

/** The nth phrase of a rotation over `phrases`. */
export function phraseAt(phrases: readonly string[], n: number): string {
  const length = phrases.length;
  const pass = Math.floor(n / length) % PASSES;
  const i = n % length;
  const odds = Math.ceil(length / 2);
  const index = [i, i < odds ? 2 * i : 2 * (i - odds) + 1, length - 1 - i][pass];
  return phrases[index] ?? '';
}

// How many results of each kind have been shown this session.
const shown = { correct: 0, incorrect: 0 };

export function nextFeedbackPhrase(correct: boolean): string {
  const kind = correct ? 'correct' : 'incorrect';
  const phrase = phraseAt(correct ? CORRECT_PHRASES : INCORRECT_PHRASES, shown[kind]);
  shown[kind] += 1;
  return phrase;
}

export function resetFeedbackPhrases(): void {
  shown.correct = 0;
  shown.incorrect = 0;
}
