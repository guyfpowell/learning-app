import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TrackMap } from '@/components/ui/TrackMap';
import type { UserPath } from '@learning/shared';

function flooredPct(path: UserPath): number {
  return path.completedLessons > 0 ? Math.max(1, Math.round(path.percentComplete)) : 0;
}

function motivation(path: UserPath, pct: number): string {
  const lessonsLeft = path.totalLessons - path.completedLessons;
  if (lessonsLeft <= 20) return `Only ${lessonsLeft} lessons to complete ${path.name}!`;
  return `You're ${pct}% through ${path.name} — keep going!`;
}

/** Prefer the capstone score; fall back to the path average; null if neither. */
function completedScore(path: UserPath): number | null {
  return path.capstoneScore ?? path.averageScore ?? null;
}

function formatDuration(enrolledAt: string, completedAt: string): string {
  const days = Math.max(1, Math.round((+new Date(completedAt) - +new Date(enrolledAt)) / 86400000));
  if (days >= 14) return `${Math.round(days / 7)} weeks`;
  return `${days} day${days > 1 ? 's' : ''}`;
}

interface PathProgressProps {
  path: UserPath;
  onFindNext: () => void;
}

/**
 * How one path is doing, for the Progress tab (ADR-009 C16).
 *
 * Fed by the same `UserPath` the Home card is fed by, so a custom path appears here
 * at all — its absence from Progress was the ticket's point 4, and it was absent
 * because Progress was written against a track-only shape.
 *
 * Branches on completion state, never on kind. The only kind-dependent details are
 * the enrolment dates, which exist solely on a track.
 */
export function PathProgress({ path, onFindNext }: PathProgressProps) {
  const isComplete = path.percentComplete >= 100;

  if (!isComplete) {
    const pct = flooredPct(path);
    return (
      <Card testID={`enrollment-card-${path.id}`} style={styles.enrollmentCard}>
        <View style={styles.enrollmentHeader}>
          <Text style={styles.enrollmentTitle}>{path.name}</Text>
          <Text style={styles.pctText}>{pct}% complete</Text>
        </View>
        <Text style={styles.motivationText}>{motivation(path, pct)}</Text>
        <Text style={styles.lessonsCount}>
          {path.completedLessons} of {path.totalLessons} lessons complete
        </Text>
        {/* A plan is dependency-ordered, so its levels array is empty (C10). */}
        {path.levels.length > 0 && <TrackMap levels={path.levels} />}
      </Card>
    );
  }

  const score = completedScore(path);
  const dates = path.kind === 'track' ? path : null;

  return (
    <Card testID={`completed-card-${path.id}`} style={styles.completedCard}>
      <View style={styles.completedHeader}>
        <Text style={[styles.enrollmentTitle, styles.completedTitle]}>{path.name}</Text>
        <Badge label="Terminus" variant="success" />
      </View>

      <View style={styles.completedMeta}>
        {dates?.completedAt && (
          <Text testID={`completed-date-${path.id}`} style={styles.completedMetaText}>
            {new Date(dates.completedAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        )}
        {dates?.completedAt && dates.enrolledAt && (
          <Text style={styles.completedMetaText}>
            {' '}· {formatDuration(dates.enrolledAt, dates.completedAt)}
          </Text>
        )}
        <Text style={styles.completedMetaText}>
          {' '}· {path.totalLessons} of {path.totalLessons} lessons
        </Text>
      </View>

      {score !== null && <Text style={styles.completedScore}>{Math.round(score)}%</Text>}

      <View style={styles.completedActions}>
        <Pressable
          testID={`completed-next-track-${path.id}`}
          style={styles.completedActionBtn}
          onPress={onFindNext}
        >
          <Text style={styles.completedActionText}>Find next track →</Text>
        </Pressable>
        <Pressable
          testID={`completed-share-${path.id}`}
          style={styles.completedShareBtn}
          onPress={() => Share.share({ message: `I just completed "${path.name}" on Ascent! 🎉` })}
        >
          <Text style={styles.completedShareText}>Share</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  enrollmentCard:    { gap: spacing.sm },
  enrollmentHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  enrollmentTitle:   { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.textStrong, flex: 1 },
  pctText:           { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.brand },
  motivationText:    { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  lessonsCount:      { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },

  completedCard:     { gap: spacing.sm },
  completedHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completedTitle:    { color: colors.textStrong },
  completedMeta:     { flexDirection: 'row', flexWrap: 'wrap' },
  completedMetaText: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted },
  completedScore:    { fontFamily: font.semibold, fontSize: fontSize.xl, color: colors.brand },
  completedActions:  { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  completedActionBtn:{ paddingVertical: spacing.xs },
  completedActionText:{ fontFamily: font.medium, fontSize: fontSize.sm, color: colors.brand },
  completedShareBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSubtle },
  completedShareText:{ fontFamily: font.medium, fontSize: fontSize.sm, color: colors.textMuted },
});
