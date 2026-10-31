import type { TrackContents } from '@learning/shared';
import { resolveTrackView, trackViewOfParams, trackViewQuery } from '../trackView';
import { trackRoute } from '../routes';

const lesson = { id: 'l-1', title: 'First', lessonNumber: 1, status: 'complete' as const, locked: false };
const topic = { key: 't-1', name: 'Topic', lessons: [lesson], completedLessons: 1, totalLessons: 1, isCurrent: true, unresolved: false };
const group = { key: 'beginner', label: 'Beginner', topics: [topic], completedLessons: 1, totalLessons: 1, isCurrent: true };
const contents: TrackContents = { kind: 'track', id: 's-1', name: 'Path', enrolled: true, groups: [group] };

describe('resolveTrackView', () => {
  it('shows the levels when nothing is asked for', () => {
    expect(resolveTrackView(contents, {})).toEqual({ level: 'levels' });
  });

  it('goes one step further for each key', () => {
    expect(resolveTrackView(contents, { group: 'beginner' })).toEqual({ level: 'topics', group });
    expect(resolveTrackView(contents, { group: 'beginner', topic: 't-1' })).toEqual({ level: 'lessons', group, topic });
    expect(resolveTrackView(contents, { group: 'beginner', topic: 't-1', lesson: 'l-1' }))
      .toEqual({ level: 'summary', group, topic, lesson });
  });

  it.each([
    ['an unknown group', { group: 'nope' }, 'levels'],
    ['an unknown topic', { group: 'beginner', topic: 'nope' }, 'topics'],
    ['an unknown lesson', { group: 'beginner', topic: 't-1', lesson: 'nope' }, 'lessons'],
    ['a topic with no group', { topic: 't-1' }, 'levels'],
  ])('falls back to the page above for %s', (_label, view, level) => {
    expect(resolveTrackView(contents, view).level).toBe(level);
  });
});

describe('trackViewOfParams', () => {
  it('reads the three params, taking the first of a repeated one', () => {
    expect(trackViewOfParams({ group: ['a', 'b'], topic: 't', lesson: undefined })).toEqual({ group: 'a', topic: 't', lesson: undefined });
  });
});

describe('trackViewQuery and trackRoute', () => {
  it('is empty for the levels page, so the route is the plain one', () => {
    expect(trackViewQuery({})).toBe('');
    expect(trackRoute('custom', 'p-1')).toBe('/track/custom/p-1');
  });

  it('encodes keys that hold sentences', () => {
    expect(trackRoute('custom', 'p-1', { group: 'Understand the role — now?', topic: 't-1' }))
      .toBe('/track/custom/p-1?group=Understand%20the%20role%20%E2%80%94%20now%3F&topic=t-1');
  });
});
