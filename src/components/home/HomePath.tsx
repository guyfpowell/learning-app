import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { SideWordAction } from '@/components/ui/SideWordAction';
import { Progress } from '@/components/ui/Progress';
import { SkipReasonPicker } from '@/components/ui/SkipReasonPicker';
import { LevelHero } from '@/components/home/LevelHero';
import { LevelBar } from '@/components/home/LevelBar';
import { flooredPct } from '@/components/ui/PathCard';
import { colors, font, fontSize, levelCard, lineHeight, spacing, trackingEm } from '@/theme';
import { continueLessonOf, continueVerb, revisitingLabel, type PathNextLesson, type PathRevisit, type SkipReason, type SkipScope, type UserPath } from '@learning/shared';

/** The lesson bar's segments: the lessons done are solid, the current one is part-lit, the rest are faint. */
const SEGMENT_HEIGHT = 5;
const SEGMENT_CURRENT = 'rgba(255,255,255,0.55)';
const SEGMENT_AHEAD = 'rgba(255,255,255,0.22)';

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

/** The path's name and progress, which opens the path. */
function PathHeader({ path, hasNextLesson, onOpen }: { path: UserPath; hasNextLesson: boolean; onOpen?: () => void }) {
  const pct = flooredPct(path);
  return (
    <Pressable
      testID={`enrollment-card-${path.id}`}
      onPress={onOpen}
      disabled={!onOpen}
      accessibilityRole={onOpen ? 'button' : undefined}
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
      {!hasNextLesson && <Text testID={`no-next-lesson-${path.id}`} style={styles.note}>No lessons available yet.</Text>}
    </Pressable>
  );
}

/** The one card for the next lesson, with the lesson skip as a small word beside its button (none on a revisit). */
function NextLessonCard({ path, lesson, revisit, skipPending, onStartLesson, onSkipLesson }: {
  path: UserPath;
  lesson: PathNextLesson;
  revisit: PathRevisit | null;
  skipPending?: SkipScope | null;
  onStartLesson: (lessonId: string) => void;
  onSkipLesson: () => void;
}) {
  // A lesson with no level takes the middle one's colour.
  const cardLevel = lesson.skillPath?.level ?? 'intermediate';
  const position = lesson.topicName && lesson.lessonIndex != null && lesson.totalLessons != null
    ? { index: lesson.lessonIndex, total: lesson.totalLessons }
    : null;
  const lessonSkipOffered = !revisit && SKIP_LINKS.some(l => l.scope === 'lesson' && l.offered(path));
  return (
    <LevelHero level={cardLevel} testID={`next-lesson-card-${path.id}`}>
      {revisit && (
        <Text testID={`revisit-label-${path.id}`} style={styles.eyebrow}>{revisitingLabel(revisit.topicTitle)}</Text>
      )}
      <View testID={`next-lesson-meta-${path.id}`} style={styles.metaRow}>
        <Text style={styles.topic} numberOfLines={2}>{lesson.topicName ?? ''}</Text>
      </View>
      {position && <LessonSegments index={position.index} total={position.total} />}
      <Text style={styles.title}>{lesson.title}</Text>
      {lesson.summary && <Text style={styles.summary}>{lesson.summary}</Text>}
      <SideWordAction
        word={lessonSkipOffered ? 'Skip' : undefined}
        color={colors.onBrand}
        onWordPress={onSkipLesson}
        wordTestID={`skip-lesson-btn-${path.id}`}
        loading={skipPending === 'lesson'}
      >
        <EdgeButton
          testID={`next-lesson-btn-${path.id}`}
          look={{ face: colors.white, label: levelCard[cardLevel].base, edge: levelCard[cardLevel].edge }}
          label={`${continueVerb(revisit, lesson)} lesson`}
          icon="next"
          onPress={() => onStartLesson(lesson.id)}
        />
      </SideWordAction>
    </LevelHero>
  );
}

/** The topic and level skips (behind flags) as links under the card, and the reason picker any skip opens. */
function SkipLinks({ path, choosing, skipPending, onChoose, onPick, onCancel }: {
  path: UserPath;
  choosing: SkipScope | null;
  skipPending?: SkipScope | null;
  onChoose: (scope: SkipScope) => void;
  onPick: (reason: SkipReason) => void;
  onCancel: () => void;
}) {
  const links = SKIP_LINKS.filter(l => l.scope !== 'lesson' && l.offered(path));
  if (links.length === 0 && !choosing) return null;
  return (
    <View style={styles.skips}>
      {links.map(l => (
        <Pressable
          key={l.scope}
          testID={`skip-${l.scope}-btn-${path.id}`}
          onPress={() => onChoose(l.scope)}
          disabled={skipPending === l.scope}
          accessibilityRole="button"
          style={styles.skip}
        >
          {skipPending === l.scope ? <ActivityIndicator color={colors.textMuted} /> : <Text style={styles.skipLabel}>{l.label}</Text>}
        </Pressable>
      ))}
      {choosing && (
        <SkipReasonPicker title={SKIP_LINKS.find(l => l.scope === choosing)?.label} onPick={onPick} onCancel={onCancel} />
      )}
    </View>
  );
}

/**
 * Home's active path: its name and progress on the page, then the one card for the next lesson,
 * with the topic and level skips under it. Both kinds of path get the same (ADR-009 C16).
 */
export function HomePath({ path, onStartLesson, onSkip, skipPending, onOpen }: HomePathProps) {
  const [choosing, setChoosing] = useState<SkipScope | null>(null);
  const { revisit, lesson } = continueLessonOf(path);
  return (
    <View>
      <PathHeader path={path} hasNextLesson={Boolean(lesson)} onOpen={onOpen} />
      {lesson && (
        <>
          <NextLessonCard path={path} lesson={lesson} revisit={revisit} skipPending={skipPending} onStartLesson={onStartLesson} onSkipLesson={() => setChoosing('lesson')} />
          {/* Skips act on the forward position, so none is offered on a revisit, an open picker included. */}
          {!revisit && (
            <SkipLinks
              path={path}
              choosing={choosing}
              skipPending={skipPending}
              onChoose={setChoosing}
              onPick={reason => {
                if (choosing) onSkip(path, choosing, reason);
                setChoosing(null);
              }}
              onCancel={() => setChoosing(null)}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  path:        { gap: spacing.sm3, marginBottom: spacing.xl + 1 },
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
  title:    { fontFamily: font.extrabold, fontSize: fontSize.xl, lineHeight: fontSize.xl * lineHeight.snug, letterSpacing: trackingEm.title * fontSize.xl, color: colors.onBrand },
  summary:  { fontFamily: font.regular, fontSize: fontSize.base, lineHeight: fontSize.base * lineHeight.normal, color: colors.brandSoft },

  skips:     { alignItems: 'center', marginTop: spacing.sm },
  skip:      { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  skipLabel: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.textMuted },
});
