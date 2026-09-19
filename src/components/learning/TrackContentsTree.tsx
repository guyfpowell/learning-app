/**
 * TrackContentsTree — three-level progressive disclosure of a path's lesson tree.
 *
 * Consumes `TrackContents` from 076c exactly as delivered: no grouping, ordering,
 * or roll-up arithmetic is performed here. All of that lives in the server payload.
 *
 * Levels: Group (level / reason sentence) → Topic → Lesson.
 * Collapsed by default; `initialExpanded` seeds the open groups/topics for 076e.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Progress } from '@/components/ui/Progress';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import type {
  TrackContents,
  TrackContentsGroup,
  TrackContentsLesson,
  TrackContentsTopic,
} from '@learning/shared';

// ─── Status marks ─────────────────────────────────────────────────────────────

const STATUS_MARK: Record<TrackContentsLesson['status'], string> = {
  complete:      '✓',
  'in-progress': '●',
  skipped:       '—',
  'not-started': '○',
};

const STATUS_COLOR: Record<TrackContentsLesson['status'], string> = {
  complete:      colors.success,
  'in-progress': colors.brand,
  skipped:       colors.textMuted,
  'not-started': colors.textSubtle,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrackContentsTreeProps {
  contents: TrackContents;
  /** Seeds the initially open group and/or topic (e.g. from 076e progress tree). */
  initialExpanded?: { groupKey?: string; topicKey?: string };
  /** Called when a lesson row is pressed. The caller decides the action
   *  (navigate for unlocked enrolled lessons, open premium modal for locked). */
  onLessonPress?: (lesson: TrackContentsLesson) => void;
}

// ─── Lesson row ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  onLessonPress,
}: {
  lesson: TrackContentsLesson;
  onLessonPress?: (lesson: TrackContentsLesson) => void;
}) {
  return (
    <Pressable
      testID={`lesson-row-${lesson.id}`}
      onPress={onLessonPress ? () => onLessonPress(lesson) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}${lesson.locked ? ', locked' : ''}, ${lesson.status.replace('-', ' ')}`}
      style={styles.lessonRow}
    >
      {/* Wrapper View carries the testID so RNTL can find it regardless of
          accessibility-hidden descendants (RNTL v12 queries the a11y tree). */}
      <View testID={`lesson-status-${lesson.id}`} style={styles.statusMarkWrapper}>
        <Text
          style={[styles.statusMark, { color: STATUS_COLOR[lesson.status] }]}
          aria-hidden
        >
          {STATUS_MARK[lesson.status]}
        </Text>
      </View>

      <Text style={[styles.lessonTitle, lesson.locked && styles.lessonTitleMuted]}>
        {lesson.title}
      </Text>

      {lesson.locked && (
        <View testID={`lesson-locked-${lesson.id}`} style={styles.lockMarkWrapper}>
          <Text style={styles.lockMark} aria-hidden>🔒</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Topic row ────────────────────────────────────────────────────────────────

function TopicRow({
  topic,
  expanded,
  onToggle,
  onLessonPress,
}: {
  topic: TrackContentsTopic;
  expanded: boolean;
  onToggle: () => void;
  onLessonPress?: (lesson: TrackContentsLesson) => void;
}) {
  const countLabel = `${topic.completedLessons} of ${topic.totalLessons}`;
  const pct = topic.totalLessons > 0
    ? Math.round((topic.completedLessons / topic.totalLessons) * 100)
    : 0;

  if (topic.unresolved) {
    return (
      <View
        testID={`topic-unresolved-${topic.key}`}
        style={[styles.topicRow, styles.topicRowUnresolved]}
        accessibilityLabel={`${topic.name}, coming soon`}
      >
        <Text style={[styles.topicName, styles.topicNameMuted]}>{topic.name}</Text>
        <Text style={styles.comingSoonLabel}>coming soon</Text>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        testID={`topic-row-${topic.key}`}
        onPress={onToggle}
        style={[styles.topicRow, topic.isCurrent && styles.topicRowCurrent]}
        accessibilityRole="button"
        accessibilityLabel={`${topic.name}, ${countLabel} lessons complete, ${expanded ? 'collapse' : 'expand'}`}
        accessibilityState={{ expanded }}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        {topic.isCurrent && (
          <View testID={`topic-current-${topic.key}`} style={styles.currentDot} />
        )}

        <View style={styles.topicContent}>
          <View style={styles.topicHeader}>
            <Text style={[styles.topicName, topic.isCurrent && styles.topicNameCurrent]}>
              {topic.name}
            </Text>
            <View style={styles.topicMeta}>
              <Text style={styles.topicCount}>{countLabel}</Text>
              <Text style={styles.topicChevron}>{expanded ? '▾' : '▸'}</Text>
            </View>
          </View>

          <View testID={`topic-progress-${topic.key}`}>
            <Progress value={pct} height={4} tone="brand" />
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.lessonList}>
          {topic.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} onLessonPress={onLessonPress} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Group row ────────────────────────────────────────────────────────────────

function GroupRow({
  group,
  expanded,
  onToggle,
  expandedTopics,
  onToggleTopic,
  onLessonPress,
}: {
  group: TrackContentsGroup;
  expanded: boolean;
  onToggle: () => void;
  expandedTopics: Set<string>;
  onToggleTopic: (key: string) => void;
  onLessonPress?: (lesson: TrackContentsLesson) => void;
}) {
  const countLabel = `${group.completedLessons} of ${group.totalLessons} lessons`;

  return (
    <View style={styles.groupContainer}>
      <Pressable
        testID={`group-row-${group.key}`}
        onPress={onToggle}
        style={[styles.groupRow, group.isCurrent && styles.groupRowCurrent]}
        accessibilityRole="button"
        accessibilityLabel={`${group.label}, ${countLabel}, ${expanded ? 'collapse' : 'expand'}`}
        accessibilityState={{ expanded }}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        {group.isCurrent && (
          <View testID={`group-current-${group.key}`} style={styles.groupCurrentBar} />
        )}

        <View style={styles.groupContent}>
          {/* label wraps freely — reason sentences must not be truncated (076d C6) */}
          <Text style={[styles.groupLabel, group.isCurrent && styles.groupLabelCurrent]}>
            {group.label}
          </Text>

          <View style={styles.groupMeta}>
            <Text testID={`group-count-${group.key}`} style={styles.groupCount}>
              {countLabel}
            </Text>
            <Text style={styles.groupChevron}>{expanded ? '▾' : '▸'}</Text>
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.topicList}>
          {group.topics.map((topic) => (
            <TopicRow
              key={topic.key}
              topic={topic}
              expanded={expandedTopics.has(topic.key)}
              onToggle={() => onToggleTopic(topic.key)}
              onLessonPress={onLessonPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function TrackContentsTree({
  contents,
  initialExpanded,
  onLessonPress,
}: TrackContentsTreeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    initialExpanded?.groupKey ? new Set([initialExpanded.groupKey]) : new Set(),
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(
    initialExpanded?.topicKey ? new Set([initialExpanded.topicKey]) : new Set(),
  );

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleTopic(key: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <View testID="track-contents-tree">
      {contents.groups.map((group) => (
        <GroupRow
          key={group.key}
          group={group}
          expanded={expandedGroups.has(group.key)}
          onToggle={() => toggleGroup(group.key)}
          expandedTopics={expandedTopics}
          onToggleTopic={toggleTopic}
          onLessonPress={onLessonPress}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Group ──────────────────────────────────────────────────────────────────
  groupContainer: {
    marginBottom: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm3,
    gap: spacing.xs,
  },
  groupRowCurrent: {
    backgroundColor: colors.brandSoft,
  },
  groupCurrentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginRight: spacing.xs,
  },
  groupContent: {
    flex: 1,
    gap: spacing.xs,
  },
  groupLabel: {
    fontFamily: font.semibold,
    fontSize: fontSize.base,
    color: colors.textStrong,
    flexShrink: 1,
    // No numberOfLines — reason sentences must wrap (076d C6)
  },
  groupLabelCurrent: {
    color: colors.brand,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupCount: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },
  groupChevron: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // ── Topic ──────────────────────────────────────────────────────────────────
  topicList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  topicRowCurrent: {
    // Accent left indicator handled by currentDot
  },
  topicRowUnresolved: {
    opacity: 0.55,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    flexShrink: 0,
  },
  topicContent: {
    flex: 1,
    gap: spacing.xs,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topicName: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textBody,
    flex: 1,
  },
  topicNameCurrent: {
    color: colors.brand,
  },
  topicNameMuted: {
    color: colors.textMuted,
  },
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topicCount: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  topicChevron: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  comingSoonLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    fontStyle: 'italic',
  },

  // ── Lesson ─────────────────────────────────────────────────────────────────
  lessonList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  statusMarkWrapper: {
    width: 20,
    alignItems: 'center',
    flexShrink: 0,
  },
  statusMark: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  lessonTitle: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textBody,
    flex: 1,
  },
  lessonTitleMuted: {
    color: colors.textMuted,
  },
  lockMarkWrapper: {
    flexShrink: 0,
  },
  lockMark: {
    fontSize: fontSize.xs,
  },
});
