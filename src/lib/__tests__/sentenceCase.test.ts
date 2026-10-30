import { sentenceCase } from '../sentenceCase';

describe('sentenceCase', () => {
  it.each([
    ['Key Takeaway', 'Key takeaway'],
    ['Back to Dashboard', 'Back to dashboard'],
    ['Start Lesson →', 'Start lesson →'],
    ['Try again', 'Try again'],
  ])('lower-cases the later words of %s', (label, expected) => {
    expect(sentenceCase(label)).toBe(expected);
  });

  it('capitalises the first letter', () => {
    expect(sentenceCase('enrol')).toBe('Enrol');
  });

  it('skips a leading emoji when capitalising', () => {
    expect(sentenceCase('🔒 upgrade')).toBe('🔒 Upgrade');
  });

  it('keeps all-caps words such as acronyms', () => {
    expect(sentenceCase('Ask the AI Coach')).toBe('Ask the AI coach');
  });

  it('keeps the proper noun Albert: "Tell Albert" was shown as "Tell albert"', () => {
    expect(sentenceCase('Tell Albert')).toBe('Tell Albert');
    expect(sentenceCase('Ask Albert Now')).toBe('Ask Albert now');
  });

  it('leaves punctuation and an empty label alone', () => {
    expect(sentenceCase('Saving…')).toBe('Saving…');
    expect(sentenceCase('')).toBe('');
  });
});
