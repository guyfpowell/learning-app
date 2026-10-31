/**
 * TrackContentsList — one step of a path's tree, for looking the path over.
 *
 * Consumes `TrackContents` from 076c exactly as delivered: no grouping, ordering,
 * or roll-up arithmetic is performed here. Each step is its own page: the levels, a level's
 * topics, a topic's lessons. A row opens the next step down; the screen puts the step in the route.
 */
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { colors, font, fontSize, spacing } from '@/theme';
import { capitalize } from '@/lib/capitalize';
import type { ResolvedTrackView, TrackView } from '@/lib/trackView';
import type { TrackContents, TrackContentsLesson } from '@learning/shared';

type StatusIcon = { name: React.ComponentProps<typeof Ionicons>['name']; color: string };

const STATUS_ICON: Record<TrackContentsLesson['status'], StatusIcon> = {
  complete:      { name: 'checkmark-circle',      color: colors.success },
  'in-progress': { name: 'radio-button-on',       color: colors.brand },
  skipped:       { name: 'remove-circle-outline', color: colors.textMuted },
  'not-started': { name: 'ellipse-outline',       color: colors.textSubtle },
};

interface TrackContentsListProps {
  contents: TrackContents;
  view: ResolvedTrackView;
  /** Opens the next step down. */
  onOpen: (view: TrackView) => void;
  /** A completed lesson was pressed: the caller opens the lesson itself (or the upgrade, for a locked one). */
  onLessonPress: (lesson: TrackContentsLesson) => void;
}

// ─── A row that opens the next step ───────────────────────────────────────────

function NavRow({ testID, title, count, current, onPress }: {
  testID: string;
  title: string;
  count: string;
  current: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count}${current ? ', current' : ''}`}
      style={styles.rowGap}
    >
      <Card padding={spacing.md} style={styles.navRow}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <View style={styles.captionRow}>
            <Text style={styles.rowCaption}>{count}</Text>
            {current && <Text style={[styles.rowCaption, styles.current]}>Current</Text>}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

function LessonRow({ lesson, last, onPress }: { lesson: TrackContentsLesson; last: boolean; onPress: () => void }) {
  const icon = STATUS_ICON[lesson.status];
  return (
    <Pressable
      testID={`lesson-row-${lesson.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}${lesson.locked ? ', locked' : ''}, ${lesson.status.replace('-', ' ')}`}
      style={[styles.lessonRow, !last && styles.lessonDivider]}
    >
      <View testID={`lesson-status-${lesson.id}`}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <Text style={[styles.lessonTitle, lesson.locked && styles.lessonTitleMuted]}>{lesson.title}</Text>
      {lesson.locked && (
        <View testID={`lesson-locked-${lesson.id}`}>
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── The three steps ──────────────────────────────────────────────────────────

const lessonsCount = (done: number, total: number) => `${done} of ${total} lessons`;

function Levels({ contents, onOpen }: Pick<TrackContentsListProps, 'contents' | 'onOpen'>) {
  return (
    <>
      {contents.groups.map((group) => (
        <NavRow
          key={group.key}
          testID={`group-row-${group.key}`}
          title={capitalize(group.label)}
          count={lessonsCount(group.completedLessons, group.totalLessons)}
          current={group.isCurrent}
          onPress={() => onOpen({ group: group.key })}
        />
      ))}
    </>
  );
}

function Topics({ view, onOpen }: { view: Extract<ResolvedTrackView, { level: 'topics' }>; onOpen: TrackContentsListProps['onOpen'] }) {
  const { group } = view;
  return (
    <>
      {group.topics.map((topic) =>
        topic.unresolved ? (
          <View key={topic.key} testID={`topic-unresolved-${topic.key}`} accessibilityLabel={`${topic.name}, coming soon`} style={[styles.rowGap, styles.unresolved]}>
            <Card padding={spacing.md}>
              <Text style={styles.rowTitle}>{topic.name}</Text>
              <Text style={styles.rowCaption}>Coming soon</Text>
            </Card>
          </View>
        ) : (
          <NavRow
            key={topic.key}
            testID={`topic-row-${topic.key}`}
            title={topic.name}
            count={lessonsCount(topic.completedLessons, topic.totalLessons)}
            current={topic.isCurrent}
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
  return (
    <Card padding={0} style={styles.lessonCard}>
      {topic.lessons.map((lesson, i) => (
        <LessonRow key={lesson.id} lesson={lesson} last={i === topic.lessons.length - 1} onPress={() => press(lesson)} />
      ))}
    </Card>
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

const styles = StyleSheet.create({
  rowGap:       { marginBottom: spacing.sm },
  navRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText:      { flex: 1, gap: spacing.xs },
  // No numberOfLines: a custom path's level is a whole sentence and must read in full (076d C6).
  rowTitle:     { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.textStrong },
  rowCaption:   { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  captionRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  current:      { color: colors.brand },
  unresolved:   { opacity: 0.55 },

  lessonCard:   { overflow: 'hidden' },
  lessonRow:    { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.sm },
  lessonDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  lessonTitle:  { flex: 1, fontFamily: font.regular, fontSize: fontSize.base, color: colors.textBody },
  lessonTitleMuted: { color: colors.textMuted },
});
