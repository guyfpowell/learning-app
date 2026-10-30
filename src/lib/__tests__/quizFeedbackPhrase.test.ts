import {
  CORRECT_PHRASES,
  INCORRECT_PHRASES,
  nextFeedbackPhrase,
  phraseAt,
  resetFeedbackPhrases,
} from '../quizFeedbackPhrase';

const ten = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
const pass = (from: number) => Array.from({ length: ten.length }, (_, i) => phraseAt(ten, from + i));

describe('phraseAt', () => {
  it('first pass goes through the list in order', () => {
    expect(pass(0)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
  });

  it('second pass takes the odd positions, then the even ones', () => {
    expect(pass(10)).toEqual(['a', 'c', 'e', 'g', 'i', 'b', 'd', 'f', 'h', 'j']);
  });

  it('third pass goes through the list backwards', () => {
    expect(pass(20)).toEqual(['j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']);
  });

  it('then starts again from the top', () => {
    expect(pass(30)).toEqual(pass(0));
  });

  it('covers an odd-length list once per pass', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    const second = Array.from({ length: 5 }, (_, i) => phraseAt(five, 5 + i));
    expect(second).toEqual(['a', 'c', 'e', 'b', 'd']);
  });
});

describe('nextFeedbackPhrase', () => {
  beforeEach(resetFeedbackPhrases);

  it('walks the correct phrases in order', () => {
    expect([nextFeedbackPhrase(true), nextFeedbackPhrase(true)]).toEqual(CORRECT_PHRASES.slice(0, 2));
  });

  it('keeps a separate position for the incorrect phrases', () => {
    nextFeedbackPhrase(true);
    nextFeedbackPhrase(true);
    expect(nextFeedbackPhrase(false)).toBe(INCORRECT_PHRASES[0]);
  });

  it('has the same number of phrases in each list', () => {
    expect(INCORRECT_PHRASES).toHaveLength(CORRECT_PHRASES.length);
  });
});
