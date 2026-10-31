import { withoutEmDashes } from '../emDash';

describe('withoutEmDashes', () => {
  it.each([
    ['leaves text with no em dash alone', 'The CPO job and the VP job', 'The CPO job and the VP job'],
    ['gives a title and what it covers a colon', "The CPO's job — product as a lever of enterprise value", "The CPO's job: product as a lever of enterprise value"],
    ['a lead-in to a list gets a colon', 'Understand what the role demands now — the scope, the decisions', 'Understand what the role demands now: the scope, the decisions'],
    ['uses a comma when the text already has a colon, so it never has two', 'Capstone: weigh the offer — the questions to ask', 'Capstone: weigh the offer, the questions to ask'],
    ['turns a pair of em dashes (an aside) into commas', 'The role — at this level — is different', 'The role, at this level, is different'],
    ['handles an em dash with no spaces around it', 'plan—then act', 'plan: then act'],
    ['gives two thoughts a full stop, not a colon', 'Great work — your custom path is complete.', 'Great work. Your custom path is complete.'],
    ['does the same when the second thought is an instruction', "Here's what I've got so far — tell me if it is wrong.", "Here's what I've got so far. Tell me if it is wrong."],
    ["keeps one full stop when the first thought already ends one", "You're done! — it is a good time to stop.", "You're done! It is a good time to stop."],
    ['uses a comma, not a colon, when the first part is a long sentence', 'This is a long first part of a sentence that runs on past the title length limit, then — stops here', 'This is a long first part of a sentence that runs on past the title length limit, then, stops here'],
    ['drops a dash at the end', 'Wait for it —', 'Wait for it'],
    ['drops a dash at the start', '— a quote', 'a quote'],
    ['shows a lone dash (a missing value) as n/a', '—', 'n/a'],
  ])('%s', (_label, input, expected) => {
    expect(withoutEmDashes(input)).toBe(expected);
  });

  it('leaves an en dash alone', () => {
    expect(withoutEmDashes('pages 3–5')).toBe('pages 3–5');
  });

  it('never returns an em dash, whatever it is given', () => {
    ['a — b — c — d', '— —', 'x—y', ' — ', 'Title — sub — more — and more'].forEach((input) => {
      expect(withoutEmDashes(input)).not.toContain('—');
    });
  });
});
