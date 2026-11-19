import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACHIEVEMENTS_BY_KEY,
  CELEBRATION_CONTINUE,
  HEIGHT_BANDS,
  LANDMARKS,
  LANDMARK_EYEBROW,
  heightBandOf,
  metresLabel,
  type Landmark,
  type RewardUnlock,
} from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { EdgeButton, type EdgeLook } from '@/components/ui/EdgeButton';
import { Medal } from '@/components/ui/Medal';
import { colors, font, shadow, spacing } from '@/theme';

const MEDAL_SIZE = 196;
/** The design's canvas, the units the contours, stars and Earth are drawn in. */
const CANVAS_WIDTH = 393;
const CANVAS_HEIGHT = 852;
const CONTOUR_CENTRE = { x: 196, y: 330 };
const CONTOUR_RADII = [50, 112, 174, 236, 298, 360, 422, 484, 546] as const;
const CONTOUR_ASPECT = 0.78;
const KARMAN_KEY = 'karman-line';
/** Stars on the edge-of-space background: x, y, radius (design units). */
const STARS = [[40, 120, 1.6], [320, 90, 1], [80, 300, 1], [350, 260, 1.6], [210, 70, 1], [140, 180, 1], [290, 420, 1.6], [30, 470, 1], [370, 500, 1]] as const;
const GRADIENT_ID = 'landmark-wash';

type GradientStop = readonly [offset: number, color: string];

/** A wash: radial from a centre height, or straight down. */
type Wash =
  | { kind: 'radial'; centreY: number; stops: readonly GradientStop[] }
  | { kind: 'linear'; stops: readonly GradientStop[] };

/** Which of the five backgrounds a landmark's screen has. */
export type LandmarkLookId = 'uk-hills' | 'mountains' | 'everest' | 'sky' | 'space';

/** A landmark screen's colours, from the design (Ascent Celebrations F2 to F4) and the Height Chart's band colours. */
export interface LandmarkLook {
  id: LandmarkLookId;
  wash: Wash;
  contour: { stroke: string; opacity: number } | null;
  eyebrow: string;
  pill: string;
  text: string;
  line: string;
  button: EdgeLook;
  statusBar: 'light' | 'dark';
}

const INK = '#121522';
const INK_SOFT = '#2A2D3A';
const CLOUDY_EYEBROW = '#6A6E7C';
const INK_PILL = 'rgba(18,21,34,.07)';
const COBALT_BUTTON: EdgeLook = { face: colors.white, label: '#1C4FD8', edge: '#123A9E' };
const PAPER_BUTTON: EdgeLook = { face: '#1C4FD8', label: colors.white, edge: '#123A9E' };
const WHITE_PILL = 'rgba(255,255,255,.16)';

const UK_HILLS: LandmarkLook = {
  id: 'uk-hills',
  wash: { kind: 'radial', centreY: 0.38, stops: [[0, '#FFFDF8'], [0.55, '#F3F1EC'], [1, '#E6DFD0']] },
  contour: { stroke: '#E3C47A', opacity: 0.5 },
  eyebrow: CLOUDY_EYEBROW,
  pill: INK_PILL,
  text: INK,
  line: INK_SOFT,
  button: PAPER_BUTTON,
  statusBar: 'dark',
};

const MOUNTAINS: LandmarkLook = {
  ...UK_HILLS,
  id: 'mountains',
  wash: { kind: 'radial', centreY: 0.38, stops: [[0, '#F1F5FC'], [0.55, '#E4EAF3'], [1, '#D3DFF4']] },
  contour: { stroke: '#8FAEEA', opacity: 0.4 },
};

const EVEREST: LandmarkLook = {
  ...UK_HILLS,
  id: 'everest',
  wash: { kind: 'radial', centreY: 0.36, stops: [[0, colors.white], [0.5, '#E4EDFA'], [1, '#B4C8EA']] },
  contour: { stroke: '#8FAEEA', opacity: 0.5 },
};

const SKY: LandmarkLook = {
  id: 'sky',
  wash: { kind: 'radial', centreY: 0.38, stops: [[0, '#2F62E8'], [0.5, '#1C4FD8'], [1, '#1A43C4']] },
  contour: { stroke: colors.white, opacity: 0.12 },
  eyebrow: 'rgba(255,255,255,.85)',
  pill: WHITE_PILL,
  text: colors.white,
  line: 'rgba(255,255,255,.88)',
  button: COBALT_BUTTON,
  statusBar: 'light',
};

const SPACE: LandmarkLook = {
  ...SKY,
  id: 'space',
  wash: { kind: 'linear', stops: [[0, '#05081C'], [0.6, '#0B1131'], [1, '#0F1A4A']] },
  contour: null,
  button: { face: colors.white, label: '#0B1131', edge: '#3A4A8A' },
};

/** One look per height band, in `HEIGHT_BANDS` order: UK hills, mountains of the world, the sky, the edge of space. */
export const LANDMARK_LOOKS: readonly LandmarkLook[] = [UK_HILLS, MOUNTAINS, SKY, SPACE];

/** The look for a landmark's screen: its height band's, and Everest's own cold blue-white. */
export function landmarkLookOf(landmark: Landmark): LandmarkLook {
  if (landmark.key === 'everest') return EVEREST;
  return LANDMARK_LOOKS[HEIGHT_BANDS.indexOf(heightBandOf(landmark.height))] ?? SPACE;
}

/**
 * The landmark a landmark unlock is for, or null when the key isn't one. The unlock carries no height,
 * and the shared table is the single source of it (ADR-022).
 */
export function landmarkOfUnlock(unlock: RewardUnlock): Landmark | null {
  return LANDMARKS.find((l) => l.key === unlock.key) ?? null;
}

/**
 * The full screen for a landmark just passed (brief section 4): "LANDMARK REACHED", the landmark's medal
 * large, its height, its name and its line, on its height band's background. No Share (owner).
 */
export function LandmarkUnlock({ unlock, onContinue }: { unlock: RewardUnlock; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const landmark = landmarkOfUnlock(unlock);
  if (landmark === null) return null;
  const look = landmarkLookOf(landmark);

  return (
    <View testID="landmark-unlock" style={styles.screen}>
      <StatusBar style={look.statusBar} />
      <Background look={look} showEarth={landmark.key === KARMAN_KEY} />
      <View style={[styles.body, { paddingTop: insets.top }]}>
        <Text testID="landmark-unlock-eyebrow" style={[styles.eyebrow, { color: look.eyebrow }]}>{LANDMARK_EYEBROW}</Text>
        <View style={styles.medal}>
          <Medal definition={ACHIEVEMENTS_BY_KEY[landmark.key]} size={MEDAL_SIZE} />
        </View>
        <View style={[styles.pill, { backgroundColor: look.pill }]}>
          <Text testID="landmark-unlock-height" style={[styles.pillText, { color: look.text }]}>{metresLabel(landmark.height)}</Text>
        </View>
        <Text testID="landmark-unlock-name" style={[styles.name, { color: look.text }]}>{unlock.name}</Text>
        <Text testID="landmark-unlock-line" style={[styles.line, { color: look.line }]}>{unlock.description}</Text>
      </View>
      <View style={[styles.action, { bottom: Math.max(insets.bottom, spacing.sm) + spacing.sm3 }]}>
        <EdgeButton testID="achievement-continue-btn" look={look.button} label={CELEBRATION_CONTINUE} onPress={onContinue} />
      </View>
    </View>
  );
}

/** The wash, the contours (or, on the edge of space, the stars) and, for the Kármán line, the Earth's curve. */
function Background({ look, showEarth }: { look: LandmarkLook; showEarth: boolean }) {
  const { wash, contour } = look;
  const fill = `url(#${GRADIENT_ID})`;
  return (
    <View testID={`landmark-background-${look.id}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} preserveAspectRatio="xMidYMin slice">
        <Defs>
          {wash.kind === 'radial' ? (
            <RadialGradient id={GRADIENT_ID} cx="50%" cy={`${wash.centreY * 100}%`} rx="90%" ry="60%">
              {wash.stops.map(([offset, color]) => <Stop key={offset} offset={offset} stopColor={color} />)}
            </RadialGradient>
          ) : (
            <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              {wash.stops.map(([offset, color]) => <Stop key={offset} offset={offset} stopColor={color} />)}
            </LinearGradient>
          )}
        </Defs>
        <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={fill} />
        {contour !== null && CONTOUR_RADII.map((radius) => (
          <Ellipse key={radius} cx={CONTOUR_CENTRE.x} cy={CONTOUR_CENTRE.y} rx={radius} ry={radius * CONTOUR_ASPECT} fill="none" stroke={contour.stroke} strokeOpacity={contour.opacity} strokeWidth={1} />
        ))}
        {look.id === 'space' && STARS.map(([x, y, r]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={colors.white} opacity={0.6} />)}
      </Svg>
      {showEarth && <Earth />}
    </View>
  );
}

const EARTH_GRADIENT_ID = 'landmark-earth-wash';
const ATMOSPHERE_ID = 'landmark-atmosphere';

/** The Earth's curve under the Kármán line, with its atmosphere and the faint line above it (design F4). */
function Earth() {
  return (
    <Svg testID="landmark-earth" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} preserveAspectRatio="xMidYMin slice">
      <Defs>
        <RadialGradient id={EARTH_GRADIENT_ID} cx="50%" cy="0%" r="70%">
          <Stop offset="0" stopColor="#2A5BE6" />
          <Stop offset="0.5" stopColor="#123A9E" />
          <Stop offset="1" stopColor="#0B1131" />
        </RadialGradient>
        <LinearGradient id={ATMOSPHERE_ID} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7FA6FF" stopOpacity={0} />
          <Stop offset="1" stopColor="#7FA6FF" stopOpacity={0.35} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={440} width={CANVAS_WIDTH} height={160} fill={`url(#${ATMOSPHERE_ID})`} />
      <Circle cx={196} cy={1530} r={1000} fill={`url(#${EARTH_GRADIENT_ID})`} stroke="#9DB6F7" strokeOpacity={0.7} strokeWidth={2} />
      <Path d="M-20 500Q196 420 413 500" fill="none" stroke={colors.white} strokeOpacity={0.22} strokeWidth={1} strokeDasharray="4 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  body:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  eyebrow: { fontFamily: font.extrabold, fontSize: 13, letterSpacing: 0.08 * 13 },
  medal:   { marginTop: spacing.lg, marginBottom: spacing.lg, ...(shadow.md as object) },
  pill:    { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  pillText: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12 },
  name:    { fontFamily: font.black, fontSize: 50, lineHeight: 50, letterSpacing: -0.045 * 50, textAlign: 'center', marginTop: 14 },
  line:    { fontFamily: font.regular, fontSize: 18, lineHeight: 18 * 1.4, textAlign: 'center', marginTop: 14, maxWidth: 300 },
  action:  { position: 'absolute', start: 20, end: 20 },
});
