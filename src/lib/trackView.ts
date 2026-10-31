import type {
  TrackContents,
  TrackContentsGroup,
  TrackContentsLesson,
  TrackContentsTopic,
} from '@learning/shared';

/**
 * Where the track screen is in the path's tree. Nothing set shows the levels; `group` shows its
 * topics; `topic` (inside that group) shows its lessons; `lesson` (inside that topic) shows its summary.
 * It travels in the route's query, so each step is its own page and Back goes up one.
 */
export interface TrackView {
  group?: string;
  topic?: string;
  lesson?: string;
}

export type ResolvedTrackView =
  | { level: 'levels' }
  | { level: 'topics'; group: TrackContentsGroup }
  | { level: 'lessons'; group: TrackContentsGroup; topic: TrackContentsTopic }
  | { level: 'summary'; group: TrackContentsGroup; topic: TrackContentsTopic; lesson: TrackContentsLesson };

/** The view a route's query asks for. A key that is not in this path falls back to the page above it. */
export function resolveTrackView(contents: TrackContents, view: TrackView): ResolvedTrackView {
  const group = contents.groups.find((g) => g.key === view.group);
  if (!group) return { level: 'levels' };
  const topic = group.topics.find((t) => t.key === view.topic);
  if (!topic) return { level: 'topics', group };
  const lesson = topic.lessons.find((l) => l.id === view.lesson);
  if (!lesson) return { level: 'lessons', group, topic };
  return { level: 'summary', group, topic, lesson };
}

/** The first value of each query param the track screen reads. */
export function trackViewOfParams(params: Record<string, string | string[] | undefined>): TrackView {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return { group: first(params.group), topic: first(params.topic), lesson: first(params.lesson) };
}

/** The query string for a view: empty for the levels page. Keys can hold any text (a reason sentence), so they are encoded. */
export function trackViewQuery(view: TrackView): string {
  const parts = (['group', 'topic', 'lesson'] as const)
    .filter((k) => view[k] !== undefined)
    .map((k) => `${k}=${encodeURIComponent(view[k] ?? '')}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
