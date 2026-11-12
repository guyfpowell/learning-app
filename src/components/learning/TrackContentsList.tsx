/**
 * TrackContentsList — one step of a path's tree, for looking the path over.
 *
 * Consumes `TrackContents` from 076c exactly as delivered: no grouping, ordering,
 * or roll-up arithmetic is performed here. Each step is its own page: the levels, a level's
 * topics, a topic's lessons. A row opens the next step down; the screen puts the step in the route.
 */
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { StatusBox, type StepStatus } from '@/components/learning/TrackSteps';
import { colors, font, fontSize, levelCard, spacing, trackingEm } from '@/theme';
import { capitalize } from '@/lib/capitalize';
import { levelOfGroup } from '@/lib/groupLevel';
import type { ResolvedTrackView, TrackView } from '@/lib/trackView';
import type { TrackContents, TrackContentsLesson, TrackContentsTopic } from '@learning/shared';

/** How a lesson's status draws in its box. */
const LESSON_BOX: Record<TrackContentsLesson['status'], StepStatus> = {
  complete:      'done',
  'in-progress': 'started',
  skipped:       'skipped',
  'not-started': 'todo',
};

/** A topic is done when every lesson is, started once one is, else to do. */
function topicStatus(topic: TrackContentsTopic): StepStatus {
  if (topic.totalLessons > 0 && topic.completedLessons === topic.totalLessons) return 'done';
  return topic.completedLessons > 0 ? 'started' : 'todo';
}

interface TrackContentsListProps {
  contents: TrackContents;
  view: ResolvedTrackView;
  /** Opens the next step down. */
  onOpen: (view: TrackView) => void;
  /** A completed lesson was pressed: the caller opens the lesson itself (or the upgrade, for a locked one). */
  onLessonPress: (lesson: TrackContentsLesson) => void;
}

// ─── Rows that open the next step ─────────────────────────────────────────────

const CHEVRON = <Icon name="forward" size={18} color={colors.textSubtle} strokeWidth={2.2} />;

/** "7 of 8 lessons", and "Current" in the level's colour when it is the one being worked on. */
function Caption({ text, current, color }: { text: string; current: boolean; color: string }) {
  return (
    <View style={styles.captionRow}>
      <Text style={styles.caption}>{text}</Text>
      {current && <Text style={[styles.caption, styles.current, { color }]}>{'\u00B7'}</Text>}
      {current && <Text style={[styles.caption, styles.current, { color }]}>Current</Text>}
    </View>
  );
}

/** A level on the track's page: its colour square, name, count and a bar. */
function LevelRow({ testID, title, done, total, current, color, onPress }: {
  testID: string;
  title: string;
  done: number;
  total: number;
  current: boolean;
  color: string;
  onPress: () => void;
}) {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const count = lessonsCount(done, total);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count}${current ? ', current' : ''}`}
      style={styles.levelRow}
    >
      <View style={[styles.square, { backgroundColor: color }]} />
      <View style={styles.rowText}>
        <Text style={styles.levelTitle}>{title}</Text>
        <Caption text={count} current={current} color={color} />
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }, pct > 0 && styles.barMin]} />
        </View>
      </View>
      {CHEVRON}
    </Pressable>
  );
}

/** A topic on a level's page: a status box, its name and how far through it is. */
function TopicRow({ testID, topic, current, color, onPress }: {
  testID: string;
  topic: TrackContentsTopic;
  current: boolean;
  color: string;
  onPress: () => void;
}) {
  const status = topicStatus(topic);
  const count = lessonsCount(topic.completedLessons, topic.totalLessons);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${topic.name}, ${count}${current ? ', current' : ''}`}
      style={styles.row}
    >
      <StatusBox status={status} color={color} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{topic.name}</Text>
        <Caption text={status === 'done' ? 'Complete' : count} current={current} color={color} />
      </View>
      {CHEVRON}
    </Pressable>
  );
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

function LessonRow({ lesson, number, color, onPress }: { lesson: TrackContentsLesson; number: number; color: string; onPress: () => void }) {
  return (
    <Pressable
      testID={`lesson-row-${lesson.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}${lesson.locked ? ', locked' : ''}, ${lesson.status.replace('-', ' ')}`}
      style={styles.lessonRow}
    >
      <View style={styles.lessonBox}>
        <StatusBox testID={`lesson-status-${lesson.id}`} status={LESSON_BOX[lesson.status]} color={color} />
      </View>
      <View style={styles.lessonText}>
        <Text style={styles.lessonNumber}>LESSON {number}</Text>
        <Text style={[styles.lessonTitle, lesson.locked && styles.lessonTitleMuted]}>{lesson.title}</Text>
      </View>
      {lesson.locked && (
        <View testID={`lesson-locked-${lesson.id}`}>
          <Icon name="locked" size={16} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.lessonChevron}>{CHEVRON}</View>
    </Pressable>
  );
}

// ─── The three steps ──────────────────────────────────────────────────────────

const lessonsCount = (done: number, total: number) => `${done} of ${total} lessons`;

function Levels({ contents, onOpen }: Pick<TrackContentsListProps, 'contents' | 'onOpen'>) {
  return (
    <>
      {contents.groups.map((group) => (
        <LevelRow
          key={group.key}
          testID={`group-row-${group.key}`}
          title={capitalize(group.label)}
          done={group.completedLessons}
          total={group.totalLessons}
          current={group.isCurrent}
          color={levelCard[levelOfGroup(group.key)].base}
          onPress={() => onOpen({ group: group.key })}
        />
      ))}
    </>
  );
}

function Topics({ view, onOpen }: { view: Extract<ResolvedTrackView, { level: 'topics' }>; onOpen: TrackContentsListProps['onOpen'] }) {
  const { group } = view;
  const color = levelCard[levelOfGroup(group.key)].base;
  return (
    <>
      {group.topics.map((topic) =>
        topic.unresolved ? (
          <View key={topic.key} testID={`topic-unresolved-${topic.key}`} accessibilityLabel={`${topic.name}, coming soon`} style={[styles.row, styles.unresolved]}>
            <StatusBox status="todo" color={color} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{topic.name}</Text>
              <Text style={styles.caption}>Coming soon</Text>
            </View>
          </View>
        ) : (
          <TopicRow
            key={topic.key}
            testID={`topic-row-${topic.key}`}
            topic={topic}
            current={topic.isCurrent}
            color={color}
            onPress={() => onOpen({ group: group.key, topic: topic.key })}
          />
        ),
      )}
    </>
  );
}

function Lessons({ view, onOpen, onLessonPress }: {
  view: Extract<ResolvedTrackView, { level: 'lessons' }>;
  onOpen: TrackContentsListProps['onOpen'];
  onLessonPress: TrackContentsListProps['onLessonPress'];
}) {
  const { group, topic } = view;
  // Looking over a path never moves you around it: a completed lesson opens, any other shows its summary.
  const press = (lesson: TrackContentsLesson) =>
    lesson.status === 'complete' ? onLessonPress(lesson) : onOpen({ group: group.key, topic: topic.key, lesson: lesson.id });
  const color = levelCard[levelOfGroup(group.key)].base;
  return (
    <>
      {topic.lessons.map((lesson, i) => (
        <LessonRow key={lesson.id} lesson={lesson} number={i + 1} color={color} onPress={() => press(lesson)} />
      ))}
    </>
  );
}

export function TrackContentsList({ contents, view, onOpen, onLessonPress }: TrackContentsListProps): ReactNode {
  return (
    <View testID="track-contents-list">
      {view.level === 'levels' && <Levels contents={contents} onOpen={onOpen} />}
      {view.level === 'topics' && <Topics view={view} onOpen={onOpen} />}
      {view.level === 'lessons' && <Lessons view={view} onOpen={onOpen} onLessonPress={onLessonPress} />}
    </View>
  );
}

const RULE = { borderTopWidth: 1, borderTopColor: colors.border } as const;
const NAME_SIZE = 18;

const styles = StyleSheet.create({
  square:       { width: 12, height: 12, borderRadius: 4 },
  levelRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: spacing.md, ...RULE },
  rowText:      { flex: 1, gap: 7 },
  // No numberOfLines: a custom path's level is a whole sentence and must read in full (076d C6).
  levelTitle:   { fontFamily: font.extrabold, fontSize: NAME_SIZE, letterSpacing: trackingEm.heading * NAME_SIZE, color: colors.textStrong },
  captionRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  caption:      { fontFamily: font.semibold, fontSize: 13, color: colors.textMuted },
  current:      { fontFamily: font.extrabold },
  bar:          { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill:      { height: 6, borderRadius: 3 },
  barMin:       { minWidth: 6 },

  row:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, ...RULE },
  rowTitle:     { fontFamily: font.bold, fontSize: fontSize.base, lineHeight: fontSize.base * 1.3, color: colors.textStrong },
  unresolved:   { opacity: 0.55 },

  lessonRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10, ...RULE },
  lessonBox:    { paddingTop: 1 },
  lessonText:   { flex: 1, gap: 2 },
  lessonNumber: { fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.07 * 11, color: colors.textSubtle },
  lessonTitle:  { fontFamily: font.semibold, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.32, color: colors.textStrong },
  lessonTitleMuted: { color: colors.textMuted },
  lessonChevron: { paddingTop: 8 },
});
