import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { Medal } from '@/components/ui/Medal';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { Wordmark } from '@/components/ui/Wordmark';
import { LevelHero } from '@/components/home/LevelHero';
import { NewUserHeading, NewUserTracks, useFirstName } from '@/components/home/NewUserParts';
import { useSkills, useTrackContents } from '@/hooks/useTrack';
import { BUILD_ROUTE, lessonRoute } from '@/lib/routes';
import { colors, font, levelCard } from '@/theme';

/** The four levels along the trail, in order. */
const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const LEVEL_NAMES = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' } as const;

/** The trail's four stops, in the board's 345 x 150 drawing. */
const TRAIL_PATH = 'M10 140 C70 140 80 104 120 100 S180 70 210 62 S280 30 335 12';
const TRAIL_STOPS = [{ x: 10, y: 140, r: 9 }, { x: 120, y: 100, r: 7 }, { x: 210, y: 62, r: 7 }, { x: 335, y: 12, r: 7 }];

/** What a person earns first: three badges and what each is for. */
const FIRST_BADGES = [
  { key: 'first-light', name: 'First Light', what: 'Your first lesson' },
  { key: 'hat-trick', name: 'Hat-Trick', what: 'Three right first time' },
  { key: 'foothills', name: 'Foothills', what: 'Your first XP level' },
];

const ON_PETROL = 'rgba(255,255,255,0.82)';

/** The first label sits at the left edge, the last at the right, the two between in the middle. */
function alignOf(index: number): 'left' | 'center' | 'right' {
  if (index === 0) return 'left';
  return index === LEVELS.length - 1 ? 'right' : 'center';
}

/** The first lesson of the first track in the catalogue's order, to start in one tap. Null until it has loaded. */
function useStarterLesson() {
  const { data: skills } = useSkills();
  const first = skills?.length ? [...skills].sort((a, b) => a.order - b.order)[0] : undefined;
  const { data: contents } = useTrackContents('track', first?.id ?? '', { enabled: !!first });
  const group = contents?.groups[0];
  const lesson = group?.topics.find(t => t.lessons.length > 0)?.lessons[0];
  if (!contents || !group || !lesson) return null;
  return { lesson, trackName: contents.name, levelName: group.label.charAt(0).toUpperCase() + group.label.slice(1) };
}

/**
 * New-user Home, "the climb" (board 22, 1c): the four levels as a trail with the person at the start, a
 * real lesson to start in one tap, and the first badges. Albert is the second route, not the first.
 */
export function NewUserClimb() {
  const router = useRouter();
  const firstName = useFirstName();
  const starter = useStarterLesson();

  return (
    <View testID="new-user-home" style={styles.page}>
      <View style={styles.intro}>
        <Wordmark height={34} variant="cobalt" />
        <Text testID="new-user-welcome" style={styles.eyebrow}>{firstName ? `WELCOME TO ASCENT, ${firstName.toUpperCase()}` : 'WELCOME TO ASCENT'}</Text>
        <Text accessibilityRole="header" style={styles.headline}>Every product career is a climb. Start yours.</Text>
        <Text style={styles.lead}>Four levels, from first principles to leading product. Learn in short lessons, whenever you've got a moment.</Text>
      </View>

      <View testID="new-user-trail" style={styles.trail}>
        <Svg style={styles.trailSvg} viewBox="0 0 345 150">
          <Path d={TRAIL_PATH} fill="none" stroke={colors.borderStrong} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
          {TRAIL_STOPS.map((stop, i) => (
            <Circle key={LEVELS[i]} cx={stop.x} cy={stop.y} r={stop.r} fill={levelCard[LEVELS[i]].base} stroke={colors.paper} strokeWidth={3} />
          ))}
          <Circle cx={10} cy={140} r={15} fill="none" stroke={levelCard.beginner.base} strokeOpacity={0.3} strokeWidth={2} />
        </Svg>
        <View style={styles.trailLabels}>
          {LEVELS.map((level, i) => (
            <View key={level} style={styles.trailLabel}>
              <Text style={[styles.levelName, { color: levelCard[level].base, textAlign: alignOf(i) }]}>{LEVEL_NAMES[level]}</Text>
              {i === 0 && <Text style={styles.here}>You start here</Text>}
            </View>
          ))}
        </View>
      </View>

      {starter && (
        <LevelHero level="beginner" testID="new-user-starter" padding={20}>
          <View style={styles.starterBody}>
            <Text style={styles.starterEyebrow}>TRY ONE NOW · ABOUT 3 MIN</Text>
            <Text style={styles.starterTitle}>{starter.lesson.title}</Text>
            <Text style={styles.starterLine}>{`${starter.trackName} · ${starter.levelName} · Lesson ${starter.lesson.lessonNumber}`}</Text>
            <View style={styles.starterAction}>
              <EdgeButton
                testID="new-user-start-lesson"
                look={{ face: colors.white, label: levelCard.beginner.dark, edge: levelCard.beginner.edge }}
                label="Start this lesson"
                icon="next"
                onPress={() => router.push(lessonRoute(starter.lesson.id))}
              />
            </View>
          </View>
        </LevelHero>
      )}

      <Pressable testID="new-user-albert-row" onPress={() => router.push(BUILD_ROUTE)} accessibilityRole="button" style={styles.albertRow}>
        <AlbertMark size={42} />
        <View style={styles.albertText}>
          <Text style={styles.albertTitle}>Or let Albert, your guide, plan your climb</Text>
          <Text style={styles.albertBody}>Describe your role and goal. Your first path is free.</Text>
        </View>
        <Icon name="forward" size={18} color={colors.textSubtle} strokeWidth={2.2} />
      </Pressable>

      <View testID="new-user-badges" style={styles.badges}>
        <NewUserHeading>What you earn on the way</NewUserHeading>
        <View style={styles.badgeGrid}>
          {FIRST_BADGES.map(badge => (
            <View key={badge.key} style={styles.badge}>
              <Medal achievement={badge.key} size={58} />
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeWhat}>{badge.what}</Text>
            </View>
          ))}
        </View>
      </View>

      <NewUserTracks heading="Pick your mountain" />
    </View>
  );
}

const styles = StyleSheet.create({
  page:  { paddingTop: 22, paddingHorizontal: 24, paddingBottom: 24, gap: 30 },
  intro: { gap: 14 },
  eyebrow:  { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12, color: colors.brand },
  headline: { fontFamily: font.black, fontSize: 40, lineHeight: 40 * 0.98, letterSpacing: -0.045 * 40, color: colors.textStrong },
  lead:     { fontFamily: font.regular, fontSize: 16, lineHeight: 16 * 1.5, color: colors.textBody },

  trail:      { gap: 6 },
  trailSvg:   { width: '100%', aspectRatio: 345 / 150 },
  trailLabels: { flexDirection: 'row', gap: 6, marginTop: -4 },
  trailLabel: { flex: 1 },
  levelName:  { fontFamily: font.extrabold, fontSize: 12 },
  here:       { fontFamily: font.semibold, fontSize: 11, color: colors.textMuted },

  starterBody:    { gap: 10 },
  starterEyebrow: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12, color: ON_PETROL },
  starterTitle:   { fontFamily: font.extrabold, fontSize: 23, lineHeight: 23 * 1.12, letterSpacing: -0.028 * 23, color: colors.white },
  starterLine:    { fontFamily: font.regular, fontSize: 14, lineHeight: 14 * 1.45, color: ON_PETROL },
  starterAction:  { marginTop: 6 },

  albertRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               14,
    paddingVertical:   16,
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.border,
  },
  albertText: { flex: 1, gap: 2 },
  albertTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.textStrong },
  albertBody:  { fontFamily: font.regular, fontSize: 13, lineHeight: 13 * 1.35, color: colors.textMuted },

  badges:    { gap: 16 },
  badgeGrid: { flexDirection: 'row', gap: 10 },
  badge:     { flex: 1, alignItems: 'center', gap: 6 },
  badgeName: { fontFamily: font.extrabold, fontSize: 13, color: colors.textStrong, textAlign: 'center' },
  badgeWhat: { fontFamily: font.regular, fontSize: 12, lineHeight: 12 * 1.3, color: colors.textMuted, textAlign: 'center' },
});
