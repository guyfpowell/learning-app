import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { LevelTag } from '@/components/ui/LevelTag';
import { Progress } from '@/components/ui/Progress';
import { SkipReasonPicker } from '@/components/ui/SkipReasonPicker';
import { CobaltHero } from '@/components/home/CobaltHero';
import { LevelBar } from '@/components/home/LevelBar';
import { flooredPct } from '@/components/ui/PathCard';
import { colors, font, fontSize, lineHeight, press, spacing, trackingEm } from '@/theme';
import { revisitingLabel, type SkipReason, type SkipScope, type UserPath } from '@learning/shared';

/** The lesson bar's segments: the lessons done are solid, the current one is part-lit, the rest are faint. */
const SEGMENT_HEIGHT = 5;
const SEGMENT_CURRENT = 'rgba(255,255,255,0.55)';
const SEGMENT_AHEAD = 'rgba(255,255,255,0.22)';

function ctaLabel(isRevisit: boolean, resumePhase: boolean): string {
  if (isRevisit) return 'Revisit lesson';
  return resumePhase ? 'Continue lesson' : 'Start lesson';
}

/**
 * The skip links, in the order they show. Lesson skips are on by default (feature:skip-lesson);
 * topic and level skips are behind their own flags, off by default (076h).
 */
const SKIP_LINKS: { scope: SkipScope; label: string; offered: (path: UserPath) => boolean }[] = [
  { scope: 'lesson', label: 'Skip lesson', offered: p => p.canSkipLesson },
  { scope: 'topic',  label: 'Skip topic',  offered: p => p.canSkipTopic },
  { scope: 'level',  label: 'Skip level',  offered: p => p.canSkipLevel },
];

function segmentColour(position: number, current: number): string {
  if (position < current) return colors.white;
  return position === current ? SEGMENT_CURRENT : SEGMENT_AHEAD;
}

/** One segment per lesson in the topic, lit up to the current one. */
function LessonSegments({ index, total }: { index: number; total: number }) {
  return (
    <View testID="lesson-segments" style={styles.segments}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: segmentColour(i + 1, index) }]} />
      ))}
    </View>
  );
}

interface HomePathProps {
  path: UserPath;
  onStartLesson: (lessonId: string) => void;
  /** Called with the reason the person picked: picking is the confirming tap (079c). */
  onSkip: (path: UserPath, scope: SkipScope, reason: SkipReason) => void;
  /** The skip in flight on this path, if any: its link shows the spinner. */
  skipPending?: SkipScope | null;
  /** Opens the path's track page. */
  onOpen?: () => void;
}

/**
 * Home's active path: its name and progress on the page, then the one cobalt card for the next lesson,
 * with the skip links under it. Both kinds of path get the same (ADR-009 C16).
 */
export function HomePath({ path, onStartLesson, onSkip, skipPending, onOpen }: HomePathProps) {
  const [choosing, setChoosing] = useState<SkipScope | null>(null);
  const pct = flooredPct(path);
  // The server decides a revisit; the client never derives one. While it is set the continue target is
  // its own lesson, and the skip links (which act on the forward position) are not offered.
  const revisit = path.kind === 'custom' ? path.revisit : null;
  const nextLesson = revisit ? revisit.nextLesson : path.nextLesson;
  const level = nextLesson?.skillPath?.level;
  const position = nextLesson?.topicName && nextLesson.lessonIndex != null && nextLesson.totalLessons != null
    ? { index: nextLesson.lessonIndex, total: nextLesson.totalLessons }
    : null;

  return (
    <View>
      <Pressable
        testID={`enrollment-card-${path.id}`}
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? `Open ${path.name}` : undefined}
        style={styles.path}
      >
        <View style={styles.pathHeader}>
          <View style={styles.titleGroup}>
            {path.kind === 'custom' && <AlbertMark size={fontSize.base} />}
            <Text testID={`path-name-${path.id}`} style={styles.pathName} numberOfLines={1}>{path.name}</Text>
          </View>
          <Text style={styles.pct}>{pct}% complete</Text>
        </View>
        {path.description != null && (
          <Text testID={`path-description-${path.id}`} style={styles.description} numberOfLines={2}>{path.description}</Text>
        )}
        {/* Only a level-ordered path has levels; a custom path's levels is [] (C10). */}
        {path.levels.length > 0 ? <LevelBar levels={path.levels} /> : <Progress value={pct} tone="brand" />}
        {path.kind === 'custom' && path.unresolvedTopics > 0 && (
          <Text testID={`plan-unresolved-${path.id}`} style={styles.note}>
            {path.unresolvedTopics} topic{path.unresolvedTopics !== 1 ? 's' : ''} not yet available
          </Text>
        )}
        {!nextLesson && <Text testID={`no-next-lesson-${path.id}`} style={styles.note}>No lessons available yet.</Text>}
      </Pressable>

      {nextLesson && (
        <>
          <CobaltHero testID={`next-lesson-card-${path.id}`}>
            {revisit && (
              <Text testID={`revisit-label-${path.id}`} style={styles.eyebrow}>{revisitingLabel(revisit.topicTitle)}</Text>
            )}
            <View testID={`next-lesson-meta-${path.id}`} style={styles.metaRow}>
              <Text style={styles.topic} numberOfLines={2}>{nextLesson.topicName ?? ''}</Text>
              {level && <LevelTag level={level} label={nextLesson.skillPath?.levelLabel ?? level} />}
            </View>
            {position && (
              <>
                <LessonSegments index={position.index} total={position.total} />
                <Text style={styles.position}>Lesson {position.index} of {position.total}</Text>
              </>
            )}
            <Text style={styles.title}>{nextLesson.title}</Text>
            {nextLesson.summary && <Text style={styles.summary}>{nextLesson.summary}</Text>}
            <EdgeButton
              testID={`next-lesson-btn-${path.id}`}
              look={{ face: colors.white, label: colors.brand, edge: press.onCobaltEdge }}
              label={ctaLabel(Boolean(revisit), Boolean(nextLesson.resumePhase))}
              icon="next"
              onPress={() => onStartLesson(nextLesson.id)}
            />
          </CobaltHero>

          {/* Skips act on the forward position, so none is offered on a revisit, an open picker included. */}
          {!revisit && (
            <View style={styles.skips}>
              {SKIP_LINKS.filter(l => l.offered(path)).map(l => (
                <Pressable
                  key={l.scope}
                  testID={`skip-${l.scope}-btn-${path.id}`}
                  onPress={() => setChoosing(l.scope)}
                  disabled={skipPending === l.scope}
                  accessibilityRole="button"
                  style={styles.skip}
                >
                  {skipPending === l.scope ? <ActivityIndicator color={colors.textMuted} /> : <Text style={styles.skipLabel}>{l.label}</Text>}
                </Pressable>
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
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  path:        { gap: spacing.sm3, marginBottom: spacing.lg },
  pathHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  titleGroup:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pathName:    { fontFamily: font.extrabold, fontSize: fontSize.md + 2, letterSpacing: trackingEm.heading * (fontSize.md + 2), color: colors.textStrong, flexShrink: 1 },
  pct:         { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.brand },
  description: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  note:        { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },

  eyebrow:  { fontFamily: font.extrabold, fontSize: fontSize.xs, letterSpacing: trackingEm.caps * fontSize.xs, color: colors.brandSoft, textTransform: 'uppercase' },
  metaRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  topic:    { flex: 1, fontFamily: font.bold, fontSize: fontSize.base - 1, lineHeight: (fontSize.base - 1) * lineHeight.normal, color: colors.brandSoft },
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment:  { flex: 1, height: SEGMENT_HEIGHT, borderRadius: SEGMENT_HEIGHT / 2 },
  position: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.brandSoft },
  title:    { fontFamily: font.extrabold, fontSize: fontSize.xl, lineHeight: fontSize.xl * lineHeight.snug, letterSpacing: trackingEm.title * fontSize.xl, color: colors.onBrand },
  summary:  { fontFamily: font.regular, fontSize: fontSize.base, lineHeight: fontSize.base * lineHeight.normal, color: colors.brandSoft },

  skips:     { alignItems: 'center', marginTop: spacing.sm },
  skip:      { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  skipLabel: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.textMuted },
});
