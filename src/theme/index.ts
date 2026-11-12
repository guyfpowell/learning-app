import { Platform } from 'react-native';

// ─── Ascent theme: Light (Altitude) ──────────────────────────────────────────
//
// From the 2026-11-11 design handoff (learning-project/docs/design_handoff_nov11).
// A Dark theme (Night Climb) will follow in its own ticket; it is not here.
//
// Rules: cobalt is the ONLY action colour. Gold = XP only. Coral = streak only.
// Green and red = correct and incorrect only.
//
// Use the semantic aliases in product code; reach for the scale tokens only when
// building new primitives.

const cobalt = {
  50:  '#EEF2FF',
  100: '#E3EAFE',
  300: '#9DB6F7',
  400: '#3D6EF5',
  500: '#2A5BE6',
  600: '#1C4FD8',  // action
  700: '#123A9E',
  800: '#0F2E8C',
} as const;

const ink = {
  900: '#121522',
  700: '#2A2D3A',
  600: '#4A4E5C',
  500: '#6A6E7C',
  400: '#8A8E9C',
  300: '#A09C93',
} as const;

const paper = {
  0:   '#FFFFFF',
  50:  '#F3F1EC',  // app background
  100: '#F1EEE8',
  150: '#EFEBE3',
  200: '#E2DDD3',
  300: '#D6D0C5',
} as const;

export const colors = {
  // Surfaces
  paper:          paper[50],    // app background
  surface:        paper[0],     // the one card per screen, sheets, tiles
  surfaceSunken:  paper[100],
  surfaceInverse: ink[900],

  // Text
  textStrong:  ink[900],
  textBody:    ink[700],
  textMuted:   ink[500],
  textSubtle:  ink[400],
  textOnBrand: '#FFFFFF',
  textInverse: paper[50],
  textLink:    cobalt[600],

  // Lines (cards have no border: these are for rules, dividers, tracks, button edges)
  borderSubtle: paper[150],
  border:       paper[200],
  borderStrong: paper[300],

  // Action
  brand:      cobalt[600],
  brandDark:  cobalt[700],
  brandPress: cobalt[800],
  brandSoft:  cobalt[100],
  onBrand:    '#FFFFFF',

  // Gamification
  xp:        '#F2B52F',
  xpDark:    '#C98A0C',
  xpEdge:    '#E3A11B',  // the rim of a gold waypoint
  xpText:    '#7A5000',
  xpSoft:    '#FFF3D3',
  xpTrack:   '#F1ECE1',
  coral:     '#FF6B3D',  // streak only
  coralDark: '#D84B20',
  coralSoft: '#FFE9E0',

  // Feedback
  success:     '#22A45D',
  successDark: '#16824A',
  successSoft: '#E6F8EC',
  successText: '#0D4F2B',
  error:       '#E5484D',
  errorDark:   '#C2373B',
  errorSoft:   '#FDECEC',
  errorText:   '#6E1A1C',
  warning:     '#F2B52F',
  warningSoft: '#FFF3D3',

  // Level tags
  levelBeginner:     { bg: '#D9F5E2', fg: '#106B36' },
  levelIntermediate: { bg: cobalt[100], fg: cobalt[700] },
  levelAdvanced:     { bg: '#EEE8FD', fg: '#5532B8' },
  levelExpert:       { bg: ink[900], fg: '#FFFFFF' },
  expert:     '#5532B8',
  expertSoft: '#EEE8FD',

  // Pure white / utility
  white: '#FFFFFF',

  // ── Legacy tokens: kept so nothing breaks. Repoint and delete. ──────
  // grep: colors\.teal|colors\.tealDark|colors\.tealLight|colors\.blue\b
  //       |colors\.blueLight|colors\.vivid\b|colors\.vividDark|colors\.bg\b
  teal:      cobalt[600],
  tealDark:  cobalt[700],
  tealLight: cobalt[400],
  blue:      cobalt[300],
  blueLight: cobalt[100],
  vivid:     cobalt[600],
  vividDark: cobalt[700],
  bg:        paper[50],
  textDark:  ink[900],
  errorBg:   '#FDECEC',
  successBg: '#E6F8EC',
} as const;

/**
 * The next-lesson card takes its colour from the lesson's level, deeper as the levels climb:
 * petrol, cobalt, violet, plum. `base` is the level's colour (its button label and its level-bar
 * segment), `light` and `dark` are the radial gradient's ends, and `edge` is the solid edge under
 * the card's white button (the dark end, deepened).
 */
export const levelCard = {
  beginner:     { base: '#17708A', light: '#2A8BA6', dark: '#105A70', edge: '#0B3B49' },
  intermediate: { base: '#1C4FD8', light: '#3D6EF5', dark: '#1840B8', edge: '#0F2E8C' },
  advanced:     { base: '#4B32C0', light: '#6A4FE0', dark: '#3A249E', edge: '#261767' },
  expert:       { base: '#74226F', light: '#9A3A93', dark: '#5A1656', edge: '#3A0E38' },
} as const;

/** The card's gradient starts at the top right; the contour lines are white at this opacity. */
export const gradients = {
  heroAt: { x: 1, y: 0 },
  contourOpacity: 0.13,
} as const;

// ─── Spacing (8 px rhythm) ────────────────────────────────────────────────────
export const spacing = {
  xs:   4,
  sm:   8,
  sm3:  12,
  md:   16,
  lg:   24,
  xl:   32,
  xl2:  40,
  xxl:  48,
  xl4:  64,
  xl6:  96,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────
export const radius = {
  xs:   8,    // tags
  sm:   12,   // chips, icon tiles
  md:   16,   // buttons, inputs, choice tiles (header buttons are 14 at 44pt)
  card: 24,   // cards, sheets
  xl:   28,   // feature / hero card
  pill: 999,
  // legacy aliases
  btn:   16,
  input: 16,
} as const;

/** Pressable depth: a solid bottom edge that collapses when held. */
export const press = {
  edge: 4,          // edge height at rest
  edgePressed: 1,   // and translateY 3 while pressed
  primaryEdge: cobalt[700],
  secondaryEdge: paper[200],
  onCobaltEdge: cobalt[800],  // white button on cobalt
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadow = {
  xs: Platform.select({
    ios:     { shadowColor: ink[900], shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    android: { elevation: 1 },
    default: {},
  }),
  card: Platform.select({
    ios:     { shadowColor: ink[900], shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 14 },
    android: { elevation: 4 },
    default: {},
  }),
  md: Platform.select({
    ios:     { shadowColor: ink[900], shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 16 },
    android: { elevation: 6 },
    default: {},
  }),
  brand: Platform.select({
    ios:     { shadowColor: cobalt[600], shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.32, shadowRadius: 20 },
    android: { elevation: 10 },
    default: {},
  }),
  coral: Platform.select({
    ios:     { shadowColor: colors.coral, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 20 },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

// ─── Typography: Schibsted Grotesk only ──────────────────────────────────────
export const font = {
  regular:   'SchibstedGrotesk_400Regular',
  medium:    'SchibstedGrotesk_500Medium',
  semibold:  'SchibstedGrotesk_600SemiBold',
  bold:      'SchibstedGrotesk_700Bold',
  extrabold: 'SchibstedGrotesk_800ExtraBold',
  black:     'SchibstedGrotesk_900Black',
  display:       'SchibstedGrotesk_900Black',
  displayMedium: 'SchibstedGrotesk_800ExtraBold',
  cta:           'SchibstedGrotesk_800ExtraBold',  // replaces the Georgia CTA font
} as const;

export const fontSize = {
  xs:   12,
  sm:   14,
  base: 16,
  md:   18,
  lg:   22,
  xl:   28,
  xxl:  40,
  hero: 54,
} as const;

// Font weight numbers (for StyleSheet fontWeight or Animated)
export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extra:    '800',
  black:    '900',
} as const;

// Line height multipliers: lineHeight = fontSize.base * lineHeight.normal
export const lineHeight = {
  tight:   0.95,
  snug:    1.1,
  normal:  1.45,
  relaxed: 1.6,
} as const;

// ─── Letter spacing ──────────────────────────────────────────────────────────
// `tracking` is in points, at a 16pt size (the app's existing values).
export const tracking = {
  tighter: -0.48,
  tight:   -0.24,
  normal:   0,
  wide:     0.64,
  caps:     1.28,
  // legacy alias
  heading:  1.2,
} as const;

/** The design's letter spacing in em: multiply by the font size (`trackingEm.display * fontSize.hero`). */
export const trackingEm = {
  display: -0.045,
  title:   -0.03,
  heading: -0.015,
  caps:     0.08,
} as const;

// ─── Quiz results: full-colour screens ───────────────────────────────────────
export const results = {
  correct: {  // full green
    gradient: ['#1C9654', '#16824A', '#0E6A3A', '#0B5C32'],  // top to bottom, deepest under the copy
    glow: 'rgba(80,220,140,0.35)', edge: '#073F22', tint: '#C6F2D7', text: '#F4FFF8', fg: '#FFFFFF',
  },
  retry: {    // sand, light
    gradient: ['#F1E6CF', '#EADBBE', '#E2D0AD'], edge: '#B8A27A', tint: '#4A3D25', text: ink[900], fg: ink[900],
    contour: '#8A7550',
  },
  incorrect: {  // ink, with a red accent
    gradient: ['#1E2335', '#171B2C', '#10131F', '#0C0E18'],
    glow: 'rgba(90,110,200,0.28)', edge: '#04050A', tint: '#C2C8DE', text: '#F5F6FB', fg: '#FFFFFF', accent: '#E5484D',
  },
} as const;

// ─── Achievement medals ──────────────────────────────────────────────────────
export const medal = {
  cobalt: cobalt[600], gold: '#F2B52F', locked: '#E6E1D8',
  // Medal finish: the dark glyph on a gold (XP) medal, a locked medal's glyph and lower tone, and the shade mixed into edges.
  // The text on the gold unlock screen (a dark brown, read on gold).
  goldText: '#4A3500',
  xpGlyph: '#5A3A00', lockedGlyph: '#A9A59C', lockedBottom: '#E2DCD2', shade: '#000000',
  tiered: { trail: '#3A6CF2', ridge: cobalt[600], summit: '#1840B8', xpTrail: '#F6C453', xpRidge: '#F2B52F', xpSummit: '#E3A11B' },
  jewel: { milestones: '#1C4FD8', session: '#127A84', accuracy: '#5B3CC4', improvement: '#A1336F', depth: '#2C3192', breadth: '#3E5872', curation: '#6E2A5C', return: '#1D6FA3', social: '#B8456B' },
} as const;
