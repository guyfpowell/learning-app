import { Platform } from 'react-native';

// ─── Colour palette ─────────────────────────────────────────────────────────
//
// All values precomputed from the design system's oklch tokens.
// Format: hex  // oklch(L C H) — provenance from learning-design-system/tokens/colors.css
//
// Use the semantic aliases below in product code; only reach for
// the scale tokens when building new primitives.

const brand = {
  50:  '#EEF6FF',  // oklch(0.971 0.018 256)
  100: '#DBEDFF',  // oklch(0.940 0.038 257)
  200: '#BFDEFF',  // oklch(0.892 0.066 256)
  300: '#94C5FF',  // oklch(0.815 0.108 256)
  400: '#5D9FFB',  // oklch(0.700 0.152 257)
  500: '#307BE6',  // oklch(0.595 0.178 258)
  600: '#1C66D2',  // oklch(0.530 0.182 259) — primary
  700: '#1752B0',  // oklch(0.460 0.162 260)
  800: '#17418B',  // oklch(0.392 0.132 261)
  900: '#173268',  // oklch(0.330 0.100 262)
} as const;

const coral = {
  50:  '#FFF1EC',  // oklch(0.969 0.018 38)
  100: '#FFE1D6',  // oklch(0.935 0.040 39)
  200: '#FFC8B5',  // oklch(0.882 0.073 39)
  300: '#FFA588',  // oklch(0.806 0.116 38)
  400: '#F97E5D',  // oklch(0.726 0.158 36)
  500: '#EF6445',  // oklch(0.672 0.178 34) — accent
  600: '#D84F38',  // oklch(0.610 0.176 32)
  700: '#AF3E30',  // oklch(0.520 0.150 30)
} as const;

const neutral = {
  0:   '#FEFDFB',  // oklch(0.994 0.003 85) — pure paper / cards
  50:  '#FBF9F5',  // oklch(0.982 0.006 83) — app background
  100: '#F5F2ED',  // oklch(0.962 0.008 82)
  150: '#EEEBE5',  // oklch(0.940 0.009 80)
  200: '#E6E1DB',  // oklch(0.912 0.010 78)
  300: '#D6D1CA',  // oklch(0.862 0.011 76)
  400: '#B0AAA3',  // oklch(0.742 0.012 72)
  500: '#8C857E',  // oklch(0.620 0.013 68)
  600: '#6C655F',  // oklch(0.512 0.013 64)
  700: '#504944',  // oklch(0.412 0.013 62)
  800: '#37312C',  // oklch(0.318 0.013 60)
  900: '#26201C',  // oklch(0.248 0.012 58)
  950: '#17120F',  // oklch(0.188 0.011 56)
} as const;

const semantic = {
  success100: '#D6F4DD',  // oklch(0.940 0.045 152)
  success500: '#3AA460',  // oklch(0.640 0.140 152)
  success700: '#217943',  // oklch(0.510 0.118 152)
  amber100:   '#FFEECF',  // oklch(0.955 0.045 84)
  amber500:   '#EDB345',  // oklch(0.800 0.140 80)  XP / badges gold
  amber700:   '#BE7C1C',  // oklch(0.640 0.130 70)
  danger100:  '#FFE3DF',  // oklch(0.940 0.035 25)
  danger500:  '#D83938',  // oklch(0.585 0.196 26)
  danger700:  '#AC2724',  // oklch(0.490 0.170 27)
} as const;

export const colors = {
  // ── Semantic aliases (use these in product code) ────────────────────
  // Surfaces
  paper:          neutral[50],   // app / page background
  surface:        neutral[0],    // cards, panels
  surfaceSunken:  neutral[100],  // wells, insets
  surfaceInverse: neutral[950],

  // Text
  textStrong:  neutral[950],
  textBody:    neutral[800],
  textMuted:   neutral[600],
  textSubtle:  neutral[500],
  textOnBrand: neutral[0],
  textInverse: neutral[50],
  textLink:    brand[600],

  // Borders
  borderSubtle: neutral[200],
  border:       neutral[300],
  borderStrong: neutral[400],

  // Brand actions
  brand:       brand[600],  // primary CTA
  brandDark:   brand[700],
  brandPress:  brand[800],
  brandSoft:   brand[50],
  onBrand:     neutral[0],

  // Energy / gamification
  coral:       coral[500],  // streak, momentum
  coralDark:   coral[600],
  coralSoft:   coral[50],
  xp:          semantic.amber500,
  xpSoft:      semantic.amber100,

  // Semantic feedback
  success:     semantic.success500,
  successSoft: semantic.success100,
  warning:     semantic.amber500,
  warningSoft: semantic.amber100,
  error:       semantic.danger500,
  errorSoft:   semantic.danger100,

  // Pure white / utility
  white: '#FFFFFF',

  // ── Legacy tokens — kept for backward compatibility ─────────────────
  // Delete once every reference in src/ and app/ is repointed.
  // grep: colors\.teal|colors\.tealDark|colors\.tealLight|colors\.blue\b
  //       |colors\.blueLight|colors\.vivid\b|colors\.vividDark|colors\.bg\b
  teal:      '#4F46E5',
  tealDark:  '#3730A3',
  tealLight: '#6366F1',
  blue:      '#7DD8E8',
  blueLight: '#BAE6FD',
  vivid:     '#0EA5E9',
  vividDark: '#0284C7',
  bg:        '#F8FAFC',
  textDark:  '#1E293B',
  errorBg:   '#FEE2E2',
  successBg: '#DCFCE7',
} as const;

// ─── Spacing (8 px rhythm) ────────────────────────────────────────────────────
export const spacing = {
  xs:   4,   // --space-1
  sm:   8,   // --space-2
  sm3:  12,  // --space-3  (gap / tight padding)
  md:   16,  // --space-4
  lg:   24,  // --space-5
  xl:   32,  // --space-6
  xl2:  40,  // --space-7
  xxl:  48,  // --space-8
  xl4:  64,  // --space-9
  xl6:  96,  // --space-10
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────
export const radius = {
  xs:   4,    // --radius-xs  (tags, badges)
  sm:   8,    // --radius-sm  (buttons, inputs)
  md:   12,   // --radius-md  (controls)
  card: 16,   // --radius-lg  (cards, panels) — was 12, now correct
  xl:   24,   // --radius-xl  (feature panels, modals)
  pill: 999,  // --radius-pill
  // legacy aliases kept for backward compat
  btn:   8,
  input: 8,
} as const;

// ─── Shadows (warm-tinted, collapsed from layered CSS to single RN shadow) ───
export const shadow = {
  xs: Platform.select({
    ios:     { shadowColor: neutral[900], shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
    android: { elevation: 1 },
    default: {},
  }),
  card: Platform.select({
    ios:     { shadowColor: neutral[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 12 },
    android: { elevation: 4 },
    default: {},
  }),
  md: Platform.select({
    ios:     { shadowColor: neutral[900], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 16 },
    android: { elevation: 6 },
    default: {},
  }),
  brand: Platform.select({
    ios:     { shadowColor: brand[600], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 20 },
    android: { elevation: 8 },
    default: {},
  }),
  coral: Platform.select({
    ios:     { shadowColor: coral[500], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.30, shadowRadius: 20 },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
//
// Display — Bricolage Grotesque  (headings, hero, numeric display)
// UI/body — Hanken Grotesk       (everything else)
export const font = {
  // Hanken Grotesk — UI / body
  regular:  'HankenGrotesk_400Regular',
  medium:   'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold:     'HankenGrotesk_700Bold',
  // Bricolage Grotesque — display
  display:       'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
} as const;

// Font size scale — aligns to --text-* (1.25 major-third, rem×16 → pt)
export const fontSize = {
  xs:   12,  // --text-xs   (labels, captions)
  sm:   14,  // --text-sm   (secondary body)
  base: 16,  // --text-base (body)
  md:   18,  // --text-md   (lead / prominent body)
  lg:   22,  // --text-lg   (section headings)
  xl:   28,  // --text-xl   (screen headings)
  xxl:  36,  // --text-2xl  (hero / display)
} as const;

// Font weight numbers (for StyleSheet fontWeight or Animated)
export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extra:    '800',
} as const;

// Line height multipliers — multiply by the font size: lineHeight = fontSize.base * lineHeight.normal
export const lineHeight = {
  tight:   1.08,  // --leading-tight   (hero / display)
  snug:    1.22,  // --leading-snug    (headings)
  normal:  1.5,   // --leading-normal  (body)
  relaxed: 1.65,  // --leading-relaxed (long-form prose)
} as const;

// ─── Letter spacing ──────────────────────────────────────────────────────────
export const tracking = {
  tighter: -0.48,  // --tracking-tighter (-0.03em @ 16px)
  tight:   -0.24,  // --tracking-tight   (-0.015em @ 16px)
  normal:   0,     // --tracking-normal
  wide:     0.64,  // --tracking-wide    (0.04em @ 16px)
  caps:     1.28,  // --tracking-caps    (0.08em @ 16px) — eyebrows / overlines
  // legacy alias kept for backward compat
  heading:  1.2,
} as const;
