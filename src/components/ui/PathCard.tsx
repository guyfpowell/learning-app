import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TrackMap } from '@/components/ui/TrackMap';
import type { UserPath } from '@learning/shared';

const difficultyVariant = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'error',
} as const;

export function flooredPct(path: Pick<UserPath, 'completedLessons' | 'percentComplete'>): number {
  return path.completedLessons > 0 ? Math.max(1, Math.round(path.percentComplete)) : 0;
}

function motivation(path: UserPath, pct: number): string {
  const lessonsLeft = path.totalLessons - path.completedLessons;
  if (lessonsLeft <= 20) return `Only ${lessonsLeft} lessons to complete ${path.name}!`;
  return `You're ${pct}% through ${path.name} — keep going!`;
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%` as `${number}%` }]} />
    </View>
  );
}

interface PathCardProps {
  path: UserPath;
  onStartLesson: (lessonId: string) => void;
  onSkipTopic: (path: UserPath) => void;
  onSkipLevel: (path: UserPath) => void;
  skipTopicPending?: boolean;
  skipLevelPending?: boolean;
}

/**
 * One card for every path the user holds, of either kind (ADR-009 C16).
 *
 * Nothing here branches on kind to decide what to render. A custom path gets the
 * next-lesson CTA and the skip affordances a track gets, because that was the whole
 * complaint: "My Path" was drawn by a different component that had neither.
 *
 * Kind is used twice, both cosmetic: a badge saying where the path came from, and
 * the unresolved-topics note, which only a plan can have.
 */
export function PathCard({
  path, onStartLesson, onSkipTopic, onSkipLevel, skipTopicPending, skipLevelPending,
}: PathCardProps) {
  const pct = flooredPct(path);
  const { nextLesson } = path;
  const level = nextLesson?.skillPath?.level;
  const levelLabel = nextLesson?.skillPath?.levelLabel;

  return (
    <>
      {nextLesson && (
        <Card testID={`next-lesson-card-${path.id}`} style={styles.nextLessonCard}>
          <View style={styles.badgeRow}>
            {path.isActive && (
              <View testID={`active-track-label-${path.id}`}>
                <Badge label="Active" variant="success" />
              </View>
            )}
            {path.kind === 'custom' && (
              <View testID={`custom-path-label-${path.id}`}>
                <Badge label="My Path" variant="info" />
              </View>
            )}
          </View>

          <Text testID={`path-name-${path.id}`} style={styles.nextLessonTrackName}>{path.name}</Text>

          <View style={styles.nextLessonMeta}>
            {level && (
              <Badge
                label={levelLabel ?? level}
                variant={difficultyVariant[level as keyof typeof difficultyVariant] ?? 'info'}
              />
            )}
            {nextLesson.topicName && (
              <Text style={styles.positionLabel}>
                {nextLesson.topicName} · Lesson {nextLesson.lessonIndex} of {nextLesson.totalLessons}
              </Text>
            )}
          </View>

          <Text style={styles.nextLessonTitle}>{nextLesson.title}</Text>
          {nextLesson.summary && <Text style={styles.nextLessonSummary}>{nextLesson.summary}</Text>}

          <Button
            testID={`next-lesson-btn-${path.id}`}
            label="Start Lesson →"
            style={styles.continueBtn}
            onPress={() => onStartLesson(nextLesson.id)}
          />

          {path.canSkipTopic && (
            <Button
              testID={`skip-topic-btn-${path.id}`}
              label="Skip Topic →"
              variant="outline"
              style={styles.skipBtn}
              loading={skipTopicPending}
              onPress={() => onSkipTopic(path)}
            />
          )}
          {path.canSkipLevel && (
            <Button
              testID={`skip-level-btn-${path.id}`}
              label="Skip Level →"
              variant="outline"
              style={styles.skipBtn}
              loading={skipLevelPending}
              onPress={() => onSkipLevel(path)}
            />
          )}
        </Card>
      )}

      <Card testID={`enrollment-card-${path.id}`} style={styles.enrollmentCard}>
        <View style={styles.enrollmentHeader}>
          <Text style={styles.enrollmentTitle} numberOfLines={1}>{path.name}</Text>
          <Text style={styles.pctText}>{pct}% complete</Text>
        </View>
        {path.description ? (
          <Text style={styles.pathDescription} numberOfLines={2}>{path.description}</Text>
        ) : null}
        <ProgressBar value={pct} />

        {/* Only a level-ordered path has a level strip; a plan's is empty (C10). */}
        {path.levels.length > 0 && <TrackMap levels={path.levels} />}

        <Text style={styles.motivationText}>{motivation(path, pct)}</Text>
        <Text style={styles.lessonsCount}>
          {path.completedLessons} of {path.totalLessons} lessons complete
        </Text>

        {path.kind === 'custom' && path.unresolvedTopics > 0 && (
          <Text testID={`plan-unresolved-${path.id}`} style={styles.noNextLesson}>
            {path.unresolvedTopics} topic{path.unresolvedTopics !== 1 ? 's' : ''} not yet available
          </Text>
        )}

        {path.upgradeRequired && (
          <Text testID={`upgrade-required-${path.id}`} style={styles.noNextLesson}>
            Upgrade to keep going on this path.
          </Text>
        )}

        {!nextLesson && !path.upgradeRequired && (
          <Text testID={`no-next-lesson-${path.id}`} style={styles.noNextLesson}>
            No lessons available yet.
          </Text>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    gap:           spacing.xs,
    flexWrap:      'wrap',
  },
  enrollmentCard: {
    gap: spacing.sm,
  },
  enrollmentHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  enrollmentTitle: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
    flex:       1,
    flexShrink: 1,
  },
  pathDescription: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  pctText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.brand,
  },
  progressTrack: {
    height:          6,
    backgroundColor: colors.borderSubtle,
    borderRadius:    3,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: colors.brand,
    borderRadius:    3,
  },
  motivationText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  lessonsCount: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  // ── Next lesson card ──────────────────────────────────────────────────────
  nextLessonCard: {
    gap: spacing.sm,
  },
  nextLessonTrackName: {
    fontFamily:    font.medium,
    fontSize:      fontSize.xs,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextLessonSummary: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    fontStyle:  'italic',
  },
  nextLessonTitle: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
  },
  nextLessonMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    flexWrap:      'wrap',
  },
  positionLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  noNextLesson: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    fontStyle:  'italic',
  },
  continueBtn: {
    marginTop: spacing.xs,
  },
  skipBtn: {
    marginTop: spacing.xs,
  },
});
