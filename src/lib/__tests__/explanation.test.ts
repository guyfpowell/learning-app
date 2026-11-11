import { splitExplanation } from '@/lib/explanation';

describe('splitExplanation', () => {
  it('leads with the first sentence and keeps the rest', () => {
    expect(splitExplanation('A segment that holds up. Aged 25 to 45 is only a trait. So there is no problem.')).toEqual({
      lead: 'A segment that holds up.',
      rest: 'Aged 25 to 45 is only a trait. So there is no problem.',
    });
  });

  it('has no rest when there is one sentence', () => {
    expect(splitExplanation('Only one sentence here.')).toEqual({ lead: 'Only one sentence here.', rest: '' });
  });

  it('treats text with no full stop as all lead', () => {
    expect(splitExplanation('  No stop at all  ')).toEqual({ lead: 'No stop at all', rest: '' });
  });

  it('does not split on a decimal point', () => {
    expect(splitExplanation('It rose 2.5 times. Then it fell.')).toEqual({ lead: 'It rose 2.5 times.', rest: 'Then it fell.' });
  });
});
