import { useState } from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { colors, font, fontSize, shadow, spacing, tracking } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, LEVEL_BADGE_VARIANT } from '@/components/ui/Badge';
import { TrackMap } from '@/components/ui/TrackMap';
import { SkipReasonPicker } from '@/components/ui/SkipReasonPicker';
import { revisitingLabel, type SkipReason, type SkipScope, type UserPath } from '@learning/shared';

export function flooredPct(path: Pick<UserPath, 'completedLessons' | 'percentComplete'>): number {
  return path.completedLessons > 0 ? Math.max(1, Math.round(path.percentComplete)) : 0;
}

function motivation(path: UserPath, pct: number): string {
  const lessonsLeft = path.totalLessons - path.completedLessons;
  if (lessonsLeft <= 20) return `Only ${lessonsLeft} lessons to complete ${path.name}!`;
  return `You're ${pct}% through ${path.name} — keep going!`;
}

function ctaLabel(isRevisit: boolean, resumePhase: boolean): string {
  if (isRevisit) return 'Revisit Lesson →';
  return resumePhase ? 'Continue Lesson →' : 'Start Lesson →';
}

/**
 * The skip buttons, in the order they show. Lesson skips are on by default (feature:skip-lesson);
 * topic and level skips are behind their own flags, off by default (076h).
 */
const SKIP_BUTTONS: { scope: SkipScope; label: string; offered: (path: UserPath) => boolean }[] = [
  { scope: 'lesson', label: 'Skip Lesson →', offered: p => p.canSkipLesson },
  { scope: 'topic',  label: 'Skip Topic →',  offered: p => p.canSkipTopic },
  { scope: 'level',  label: 'Skip Level →',  offered: p => p.canSkipLevel },
];

function ProgressBar({ value }: { value: number }) {
  const width: DimensionValue = `${Math.min(100, Math.max(0, value))}%`;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width }]} />
    </View>
  );
}

export type PathCardVariant = 'default' | 'hero';

interface PathCardProps {
  path: UserPath;
  onStartLesson: (lessonId: string) => void;
  /** Called with the reason the person picked — picking is the confirming tap (079c). */
  onSkip: (path: UserPath, scope: SkipScope, reason: SkipReason) => void;
  /** The skip in flight on this path, if any: its button shows the spinner. */
  skipPending?: SkipScope | null;
  /** `hero` draws the next-lesson card as a cobalt brand moment (Home's active path). */
  variant?: PathCardVariant;
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
  path, onStartLesson, onSkip, skipPending, variant = 'default',
}: PathCardProps) {
  const [choosing, setChoosing] = useState<SkipScope | null>(null);
  const pct = flooredPct(path);
  // The server decides a revisit; the client never derives one. While it is set the continue target is
  // its own lesson, and the skip controls (which act on the forward position) are not offered.
  const revisit = path.kind === 'custom' ? path.revisit : null;
  const nextLesson = revisit ? revisit.nextLesson : path.nextLesson;
  const level = nextLesson?.skillPath?.level;
  const levelLabel = nextLesson?.skillPath?.levelLabel;
  const hero = variant === 'hero';

  // Skips act on the forward position, so none is offered on a revisit, an open picker included.
  const skipControls = !revisit && (
    <>
      {SKIP_BUTTONS.filter(b => b.offered(path)).map(b => (
        <Button
          key={b.scope}
          testID={`skip-${b.scope}-btn-${path.id}`}
          label={b.label}
          variant={hero ? 'ghost' : 'outline'}
          style={styles.skipBtn}
          loading={skipPending === b.scope}
          onPress={() => setChoosing(b.scope)}
        />
      ))}

      {choosing && (
        <SkipReasonPicker
          onPick={reason => {
            setChoosing(null);
            onSkip(path, choosing, reason);
          }}
          onCancel={() => setChoosing(null)}
        />
      )}
    </>
  );

  return (
    <>
      {/* Progress card — renders first (076g card order: streak → path progress → next lesson). */}
      <Card testID={`enrollment-card-${path.id}`} style={[styles.enrollmentCard, hero && styles.heroProgressCard]}>
        {/* Badges — moved here from next-lesson card (076g §3). */}
        {(path.isActive || path.kind === 'custom') && (
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
        )}

        <View style={styles.enrollmentHeader}>
          {/* testID moved here from the next-lesson card (076g §3 — preserves ex-line 78 testID). */}
          <Text testID={`path-name-${path.id}`} style={styles.enrollmentTitle} numberOfLines={1}>{path.name}</Text>
          <Text style={styles.pctText}>{pct}% complete</Text>
        </View>
        {path.description != null && (
          <Text testID={`path-description-${path.id}`} style={styles.pathDescription} numberOfLines={2}>
            {path.description}
          </Text>
        )}
        <ProgressBar value={pct} />

        {/* Only a level-ordered path has a level strip; a custom path's levels is [] (C10). */}
        {path.levels.length > 0 && <TrackMap levels={path.levels} showStatus={!hero} />}

        {/* Home's hero card omits these two lines and TrackMap's status line above (091d); other cards keep them. */}
        {!hero && (
          <>
            <Text style={styles.motivationText}>{motivation(path, pct)}</Text>
            <Text style={styles.lessonsCount}>
              {path.completedLessons} of {path.totalLessons} lessons complete
            </Text>
          </>
        )}

        {path.kind === 'custom' && path.unresolvedTopics > 0 && (
          <Text testID={`plan-unresolved-${path.id}`} style={styles.noNextLesson}>
            {path.unresolvedTopics} topic{path.unresolvedTopics !== 1 ? 's' : ''} not yet available
          </Text>
        )}

        {!nextLesson && (
          <Text testID={`no-next-lesson-${path.id}`} style={styles.noNextLesson}>
            No lessons available yet.
          </Text>
        )}
      </Card>

      {/* Next-lesson card — renders second. Path identity lives in the progress card above (076g §3).
          The hero is cobalt, so its skip controls sit on paper beneath it (no brand button on brand). */}
      {nextLesson && (
        <>
          <Card
            testID={`next-lesson-card-${path.id}`}
            style={[styles.nextLessonCard, hero && styles.heroCard]}
          >
            <View style={styles.nextLessonMeta}>
              {level && (
                <Badge
                  label={levelLabel ?? level}
                  variant={LEVEL_BADGE_VARIANT[level]}
                />
              )}
              {nextLesson.topicName && (
                <Text style={[styles.positionLabel, hero && styles.heroEyebrow]}>
                  {nextLesson.topicName} · Lesson {nextLesson.lessonIndex} of {nextLesson.totalLessons}
                </Text>
              )}
            </View>

            {revisit && (
              <Text testID={`revisit-label-${path.id}`} style={[styles.revisitLabel, hero && styles.heroEyebrow]}>
                {revisitingLabel(revisit.topicTitle)}
              </Text>
            )}
            <Text style={[styles.nextLessonTitle, hero && styles.heroTitle]}>{nextLesson.title}</Text>
            {nextLesson.summary && (
              <Text style={[styles.nextLessonSummary, hero && styles.heroSummary]}>{nextLesson.summary}</Text>
            )}

            <Button
              testID={`next-lesson-btn-${path.id}`}
              label={ctaLabel(Boolean(revisit), Boolean(nextLesson.resumePhase))}
              variant={hero ? 'coral' : 'primary'}
              style={styles.continueBtn}
              onPress={() => onStartLesson(nextLesson.id)}
            />

            {!hero && skipControls}
          </Card>
          {hero && <View style={styles.heroSkips}>{skipControls}</View>}
        </>
      )}
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
  pathDescription: {
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
  nextLessonSummary: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    fontStyle:  'italic',
  },
  revisitLabel: {
    fontFamily:    font.medium,
    fontSize:      fontSize.xs,
    color:         colors.coral,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  heroProgressCard: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  heroCard: {
    marginTop:       spacing.md,
    backgroundColor: colors.brand,
    ...shadow.brand,
  },
  heroSkips: {
    marginTop: spacing.md,
    gap:       spacing.sm,
  },
  heroEyebrow: {
    fontFamily:    font.bold,
    color:         colors.brandSoft,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily:    font.display,
    fontSize:      fontSize.md,
    letterSpacing: tracking.tight,
    color:         colors.onBrand,
  },
  heroSummary: {
    color:     colors.brandSoft,
    fontStyle: 'normal',
  },
  continueBtn: {
    marginTop: spacing.xs,
  },
  skipBtn: {
    marginTop: spacing.xs,
  },
});
