import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACHIEVEMENTS_BY_KEY, ACHIEVEMENT_UNLOCKED_EYEBROW, CELEBRATION_CONTINUE, celebrationEyebrow, hasMedalArt, mixHex, type RewardUnlock } from '@learning/shared';
import { LandmarkUnlock } from '@/components/celebrations/LandmarkUnlock';
import { Text } from '@/components/ui/Text';
import { EdgeButton, type EdgeLook } from '@/components/ui/EdgeButton';
import { Medal } from '@/components/ui/Medal';
import { medalJewelOf } from '@/lib/medalJewel';
import { colors, font, medal, shadow, spacing } from '@/theme';

const MEDAL_SIZE = 168;
/** The contour ellipses: radius, tilt (degrees); the board's seven. */
const RINGS = [[60, -8], [110, -5], [165, -2], [225, 1], [290, 4], [360, 7], [435, 10]] as const;
const RING_ASPECT = 0.78;
const CENTRE_Y = 0.38;

/** The unlock screen's colours. */
export interface UnlockLook {
  bg: string;
  light: string;
  dark: string;
  text: string;
  soft: string;
  chip: string;
  button: EdgeLook;
  statusBar: 'light';
}

/** The unlock screen's colours: the medal's jewel colour. */
export function unlockLook(base: string): UnlockLook {
  return {
    bg: base,
    light: mixHex(base, colors.white, 0.25),
    dark: mixHex(base, medal.shade, 0.45),
    text: colors.white,
    soft: mixHex(base, colors.white, 0.85),
    chip: 'rgba(255,255,255,0.16)',
    button: { face: colors.white, label: base, edge: mixHex(base, medal.shade, 0.7) },
    statusBar: 'light',
  };
}

/** The full screen for one unlock just earned: a landmark has its own (`LandmarkUnlock`), a medal or step this one. */
export function AchievementUnlock({ unlock, onContinue }: { unlock: RewardUnlock; onContinue: () => void }) {
  if (unlock.kind === 'landmark') return <LandmarkUnlock unlock={unlock} onContinue={onContinue} entrance={null} />;
  return <MedalUnlock unlock={unlock} onContinue={onContinue} />;
}

/**
 * A full screen for one medal just earned (brief section 4): the category's colour washed over the
 * screen, the medal large, its category alone, its name and what earned it. No Share (owner).
 */
function MedalUnlock({ unlock, onContinue }: { unlock: RewardUnlock; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  // The words come from the server's payload; the catalogue is read only to draw the medal and pick its colour.
  const def = ACHIEVEMENTS_BY_KEY[unlock.key];
  const hasMedal = hasMedalArt(def);
  const look = unlockLook(medalJewelOf(def));
  const tag = hasMedal ? celebrationEyebrow(def) : null;

  return (
    <View testID="achievement-unlock" style={[styles.screen, { backgroundColor: look.bg }]}>
      <StatusBar style={look.statusBar} />
      <Wash look={look} />
      <View style={[styles.body, { paddingTop: insets.top }]}>
        <Text testID="achievement-unlock-eyebrow" style={[styles.eyebrow, { color: look.soft }]}>{ACHIEVEMENT_UNLOCKED_EYEBROW}</Text>
        {hasMedal && (
          <View style={styles.medal}>
            <Medal definition={def} size={MEDAL_SIZE} />
          </View>
        )}
        <View style={[styles.words, !hasMedal && styles.wordsNoMedal]}>
          {tag && (
            <View testID="achievement-unlock-tag" style={[styles.chip, { backgroundColor: look.chip }]}>
              <Text testID="achievement-unlock-category" style={[styles.chipText, { color: look.text }]}>{tag}</Text>
            </View>
          )}
          <Text testID="achievement-unlock-name" style={[styles.name, { color: look.text }]}>{unlock.name}</Text>
          <Text testID="achievement-unlock-description" style={[styles.description, { color: look.soft }]}>{unlock.description}</Text>
        </View>
      </View>
      <View style={[styles.action, { bottom: Math.max(insets.bottom, spacing.sm) + spacing.sm3 }]}>
        <EdgeButton testID="achievement-continue-btn" look={look.button} label={CELEBRATION_CONTINUE} onPress={onContinue} />
      </View>
    </View>
  );
}

/** The screen's radial wash and the contour rings around the medal. */
function Wash({ look }: { look: UnlockLook }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="unlock-wash" cx="50%" cy={`${CENTRE_Y * 100}%`} r="75%">
            <Stop offset="0" stopColor={look.light} />
            <Stop offset="0.42" stopColor={look.bg} />
            <Stop offset="1" stopColor={look.dark} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#unlock-wash)" />
        {RINGS.map(([radius, tilt]) => (
          <Ellipse
            key={radius}
            cx="50%"
            cy={`${CENTRE_Y * 100}%`}
            rx={radius}
            ry={radius * RING_ASPECT}
            transform={`rotate(${tilt} 196 330)`}
            fill="none"
            stroke={colors.white}
            strokeOpacity={0.09}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  body:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  eyebrow: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.14 * 12 },
  medal:   { marginVertical: spacing.lg, ...shadow.md },
  words:   { alignItems: 'center', gap: spacing.sm3 },
  wordsNoMedal: { marginTop: spacing.lg },
  chip:    { borderRadius: 999, paddingVertical: 6, paddingHorizontal: spacing.sm3 },
  chipText: { fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.12 * 11 },
  name:    { fontFamily: font.black, fontSize: 44, lineHeight: 44, letterSpacing: -0.04 * 44, textAlign: 'center' },
  description: { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.45, textAlign: 'center', maxWidth: 280 },
  action:  { position: 'absolute', start: 20, end: 20 },
});
