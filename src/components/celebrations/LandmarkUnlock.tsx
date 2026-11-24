import { useRef, type ComponentProps, type ComponentRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ACHIEVEMENTS_BY_KEY,
  CELEBRATION_CONTINUE,
  LANDMARK_CANVAS,
  LANDMARK_CONTOURS,
  LANDMARK_CONTOUR_STROKE,
  LANDMARK_EARTH,
  LANDMARK_EYEBROW,
  LANDMARK_STAR,
  LANDMARK_STARS,
  landmarkByKey,
  landmarkLookOf,
  metresLabel,
  showsEarth,
  type LandmarkLook,
  type RewardUnlock,
} from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { EdgeButton, type EdgeLook } from '@/components/ui/EdgeButton';
import { Medal } from '@/components/ui/Medal';
import { colors, font, shadow, spacing } from '@/theme';

export const MEDAL_SIZE = 196;
const VIEW_BOX = `0 0 ${LANDMARK_CANVAS.width} ${LANDMARK_CANVAS.height}`;
const GRADIENT_ID = 'landmark-wash';

type GradientStop = readonly [offset: number, color: string];

/** A wash: radial from a centre height, or straight down. */
type Wash =
  | { kind: 'radial'; centreY: number; stops: readonly GradientStop[] }
  | { kind: 'linear'; stops: readonly GradientStop[] };

/** A landmark screen's colours, from the design (Ascent Celebrations F2 to F4) and the Height Chart's band colours. */
export interface LandmarkColours {
  wash: Wash;
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

const UK_HILLS: LandmarkColours = {
  wash: { kind: 'radial', centreY: 0.38, stops: [[0, '#FFFDF8'], [0.55, '#F3F1EC'], [1, '#E6DFD0']] },
  eyebrow: CLOUDY_EYEBROW,
  pill: INK_PILL,
  text: INK,
  line: INK_SOFT,
  button: PAPER_BUTTON,
  statusBar: 'dark',
};

const SKY: LandmarkColours = {
  wash: { kind: 'radial', centreY: 0.38, stops: [[0, '#2F62E8'], [0.5, '#1C4FD8'], [1, '#1A43C4']] },
  eyebrow: 'rgba(255,255,255,.85)',
  pill: WHITE_PILL,
  text: colors.white,
  line: 'rgba(255,255,255,.88)',
  button: COBALT_BUTTON,
  statusBar: 'light',
};

/** Each look's colours (the shared `landmarkLookOf` decides the look). */
export const LANDMARK_COLOURS: Record<LandmarkLook, LandmarkColours> = {
  'uk-hills': UK_HILLS,
  mountains: { ...UK_HILLS, wash: { kind: 'radial', centreY: 0.38, stops: [[0, '#F1F5FC'], [0.55, '#E4EAF3'], [1, '#D3DFF4']] } },
  everest: { ...UK_HILLS, wash: { kind: 'radial', centreY: 0.36, stops: [[0, colors.white], [0.5, '#E4EDFA'], [1, '#B4C8EA']] } },
  sky: SKY,
  space: {
    ...SKY,
    wash: { kind: 'linear', stops: [[0, '#05081C'], [0.6, '#0B1131'], [1, '#0F1A4A']] },
    button: { face: colors.white, label: '#0B1131', edge: '#3A4A8A' },
  },
};

/** How the arrival (ticket 114) drives this card: the medal moves by its own animated style, everything else fades in as `chromeOpacity` rises, and `onMedalCentre` says where the medal rests on the screen. */
export interface LandmarkEntrance {
  medalStyle: ComponentProps<typeof Animated.View>['style'];
  chromeOpacity: Animated.AnimatedInterpolation<number>;
  onMedalCentre: (centre: { x: number; y: number }) => void;
}

/**
 * The full screen for a landmark just passed (brief section 4): "LANDMARK REACHED", the landmark's medal
 * large, its height, its name and its line, on its height band's background. No Share (owner). `entrance` is
 * the arrival's control of how it appears (null: the card simply shows).
 */
export function LandmarkUnlock({ unlock, onContinue, entrance }: { unlock: RewardUnlock; onContinue: () => void; entrance: LandmarkEntrance | null }) {
  const insets = useSafeAreaInsets();
  const medalSlot = useRef<ComponentRef<typeof View>>(null);
  const landmark = landmarkByKey(unlock.key);
  if (landmark === null) return null;
  const look = landmarkLookOf(landmark);
  const colours = LANDMARK_COLOURS[look];
  const chrome = entrance?.chromeOpacity ?? 1;
  const reportMedalCentre = () => {
    medalSlot.current?.measureInWindow((x, y, width, height) => entrance?.onMedalCentre({ x: x + width / 2, y: y + height / 2 }));
  };

  return (
    <View testID="landmark-unlock" style={styles.screen}>
      <StatusBar style={colours.statusBar} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: chrome }]}>
        <Background look={look} wash={colours.wash} showEarth={showsEarth(landmark)} />
      </Animated.View>
      <View style={[styles.body, { paddingTop: insets.top }]}>
        <Animated.View style={{ opacity: chrome }}>
          <Text testID="landmark-unlock-eyebrow" style={[styles.eyebrow, { color: colours.eyebrow }]}>{LANDMARK_EYEBROW}</Text>
        </Animated.View>
        <View ref={medalSlot} onLayout={reportMedalCentre} style={styles.medal}>
          <Animated.View style={entrance?.medalStyle}>
            <Medal definition={ACHIEVEMENTS_BY_KEY[landmark.key]} size={MEDAL_SIZE} />
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: chrome, alignItems: 'center' }}>
          <View style={[styles.pill, { backgroundColor: colours.pill }]}>
            <Text testID="landmark-unlock-height" style={[styles.pillText, { color: colours.text }]}>{metresLabel(landmark.height)}</Text>
          </View>
          <Text testID="landmark-unlock-name" style={[styles.name, { color: colours.text }]}>{unlock.name}</Text>
          <Text testID="landmark-unlock-line" style={[styles.line, { color: colours.line }]}>{unlock.description}</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.action, { bottom: Math.max(insets.bottom, spacing.sm) + spacing.sm3, opacity: chrome }]}>
        <EdgeButton testID="achievement-continue-btn" look={colours.button} label={CELEBRATION_CONTINUE} onPress={onContinue} />
      </Animated.View>
    </View>
  );
}

/** The wash, the contours (or, on the edge of space, the stars) and, for the Kármán line, the Earth's curve. */
function Background({ look, wash, showEarth }: { look: LandmarkLook; wash: Wash; showEarth: boolean }) {
  const contour = LANDMARK_CONTOUR_STROKE[look];
  const { centre, radii, aspect } = LANDMARK_CONTOURS;
  return (
    <View testID={`landmark-background-${look}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMin slice">
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
        <Rect width={LANDMARK_CANVAS.width} height={LANDMARK_CANVAS.height} fill={`url(#${GRADIENT_ID})`} />
        {contour !== null && radii.map((radius) => (
          <Ellipse key={radius} cx={centre.x} cy={centre.y} rx={radius} ry={radius * aspect} fill="none" stroke={contour.stroke} strokeOpacity={contour.opacity} strokeWidth={1} />
        ))}
        {look === 'space' && LANDMARK_STARS.map(([x, y, r]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={LANDMARK_STAR.fill} opacity={LANDMARK_STAR.opacity} />)}
      </Svg>
      {showEarth && <Earth />}
    </View>
  );
}

const EARTH_GRADIENT_ID = 'landmark-earth-wash';
const ATMOSPHERE_ID = 'landmark-atmosphere';

/** The Earth's curve under the Kármán line, with its atmosphere and the faint line above it (design F4). */
function Earth() {
  const { wash, globe, atmosphere, line } = LANDMARK_EARTH;
  return (
    <Svg testID="landmark-earth" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMin slice">
      <Defs>
        <RadialGradient id={EARTH_GRADIENT_ID} cx={wash.cx} cy={wash.cy} r={wash.r}>
          {wash.stops.map(([offset, colour]) => <Stop key={offset} offset={offset} stopColor={colour} />)}
        </RadialGradient>
        <LinearGradient id={ATMOSPHERE_ID} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={atmosphere.colour} stopOpacity={atmosphere.fromOpacity} />
          <Stop offset="1" stopColor={atmosphere.colour} stopOpacity={atmosphere.toOpacity} />
        </LinearGradient>
      </Defs>
      <Rect x={atmosphere.x} y={atmosphere.y} width={atmosphere.width} height={atmosphere.height} fill={`url(#${ATMOSPHERE_ID})`} />
      <Circle cx={globe.cx} cy={globe.cy} r={globe.r} fill={`url(#${EARTH_GRADIENT_ID})`} stroke={globe.stroke} strokeOpacity={globe.strokeOpacity} strokeWidth={globe.strokeWidth} />
      <Path d={line.d} fill="none" stroke={line.stroke} strokeOpacity={line.strokeOpacity} strokeWidth={line.strokeWidth} strokeDasharray={line.dash} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  body:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  eyebrow: { fontFamily: font.extrabold, fontSize: 13, letterSpacing: 0.08 * 13 },
  medal:   { marginTop: spacing.lg, marginBottom: spacing.lg, ...shadow.md },
  pill:    { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  pillText: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12 },
  name:    { fontFamily: font.black, fontSize: 50, lineHeight: 50, letterSpacing: -0.045 * 50, textAlign: 'center', marginTop: 14 },
  line:    { fontFamily: font.regular, fontSize: 18, lineHeight: 18 * 1.4, textAlign: 'center', marginTop: 14, maxWidth: 300 },
  action:  { position: 'absolute', start: 20, end: 20 },
});
