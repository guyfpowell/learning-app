import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACHIEVEMENTS_BY_KEY, type AchievementKey } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Medal, XP_CATEGORY, medalBaseOf, medalInfoOf } from '@/components/ui/Medal';
import { mixHex } from '@/lib/mixHex';
import { colors, font, medal, shadow, spacing } from '@/theme';

const MEDAL_SIZE = 168;
/** The contour ellipses: radius, tilt (degrees); the board's seven. */
const RINGS = [[60, -8], [110, -5], [165, -2], [225, 1], [290, 4], [360, 7], [435, 10]] as const;
const RING_ASPECT = 0.78;
const CENTRE_Y = 0.38;

/** The unlock screen's colours: the category's jewel colour, or gold with ink text for an XP milestone. */
export function unlockLook(category: string) {
  const base = medalBaseOf(category);
  if (category === XP_CATEGORY) {
    return {
      bg: base,
      light: mixHex(base, colors.white, 0.25),
      dark: mixHex(base, medal.shade, 0.2),
      text: colors.textStrong,
      soft: medal.goldText,
      chip: 'rgba(18,21,34,0.1)',
      button: { face: colors.surfaceInverse, label: colors.white, edge: medal.shade },
      statusBar: 'dark' as const,
    };
  }
  return {
    bg: base,
    light: mixHex(base, colors.white, 0.25),
    dark: mixHex(base, medal.shade, 0.45),
    text: colors.white,
    soft: mixHex(base, colors.white, 0.85),
    chip: 'rgba(255,255,255,0.16)',
    button: { face: colors.white, label: base, edge: mixHex(base, medal.shade, 0.7) },
    statusBar: 'light' as const,
  };
}

/**
 * A full screen for one achievement just earned (board 16, 6.04 to 6.06): the category's colour
 * washed over the screen, the medal large, its category and tier, its name and what earned it.
 */
export function AchievementUnlock({ achievement, onContinue }: { achievement: AchievementKey; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const def = ACHIEVEMENTS_BY_KEY[achievement];
  const info = medalInfoOf(achievement);
  const look = unlockLook(info?.category ?? 'Milestones');
  const tag = info ? `${info.category} · ${info.tier}`.toUpperCase() : null;

  return (
    <View testID="achievement-unlock" style={[styles.screen, { backgroundColor: look.bg }]}>
      <StatusBar style={look.statusBar} />
      <Wash look={look} />
      <View style={[styles.body, { paddingTop: insets.top }]}>
        <Text style={[styles.eyebrow, { color: look.soft }]}>ACHIEVEMENT UNLOCKED</Text>
        <View style={styles.medal}>
          <Medal achievement={achievement} size={MEDAL_SIZE} />
        </View>
        <View style={styles.words}>
          {tag && (
            <View testID="achievement-unlock-tag" style={[styles.chip, { backgroundColor: look.chip }]}>
              <Text style={[styles.chipText, { color: look.text }]}>{tag}</Text>
            </View>
          )}
          <Text testID="achievement-unlock-name" style={[styles.name, { color: look.text }]}>{def.name}</Text>
          <Text testID="achievement-unlock-description" style={[styles.description, { color: look.soft }]}>{def.description}</Text>
        </View>
      </View>
      <View style={[styles.action, { bottom: Math.max(insets.bottom, spacing.sm) + spacing.sm3 }]}>
        <EdgeButton testID="achievement-continue-btn" look={look.button} label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

/** The screen's radial wash and the contour rings around the medal. */
function Wash({ look }: { look: ReturnType<typeof unlockLook> }) {
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
  medal:   { marginVertical: spacing.lg, ...(shadow.md as object) },
  words:   { alignItems: 'center', gap: spacing.sm3 },
  chip:    { borderRadius: 999, paddingVertical: 6, paddingHorizontal: spacing.sm3 },
  chipText: { fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.12 * 11 },
  name:    { fontFamily: font.black, fontSize: 44, lineHeight: 44, letterSpacing: -0.04 * 44, textAlign: 'center' },
  description: { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.45, textAlign: 'center', maxWidth: 280 },
  action:  { position: 'absolute', start: 20, end: 20 },
});
