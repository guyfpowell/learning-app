import { Platform } from 'react-native';

// ─── Colours ────────────────────────────────────────────────────────────────
export const colors = {
  // Ascent brand — cobalt (brand-600 ≈ oklch 0.530 0.182 259)
  brand:     '#4060C8',
  brandDark: '#2E48A5',
  brandSoft: '#E8EDFB',
  // Ascent energy — coral (coral-500 ≈ oklch 0.672 0.178 34)
  coral:     '#E0603A',
  coralSoft: '#FBF0EC',
  // Warm neutrals (neutral-50 / neutral-0)
  paper:     '#F9F8F6',
  surface:   '#FEFDFB',
  // Legacy tokens — kept for backward compatibility with non-auth screens
  teal:      '#4F46E5',
  tealDark:  '#3730A3',
  tealLight: '#6366F1',
  blue:      '#7DD8E8',
  blueLight: '#BAE6FD',
  vivid:     '#0EA5E9',
  vividDark: '#0284C7',
  bg:        '#F8FAFC',
  white:     '#FFFFFF',
  error:     '#DC2626',
  errorBg:   '#FEE2E2',
  success:   '#16A34A',
  successBg: '#DCFCE7',
  textMuted: '#9CA3AF',
  textDark:  '#1E293B',
  border:    '#E2E8F0',
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────
export const radius = {
  card:  12,
  btn:   8,
  input: 8,
  pill:  999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
export const font = {
  regular: 'Poppins_400Regular',
  medium:  'Poppins_500Medium',
  bold:    'Poppins_700Bold',
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  30,
} as const;

// ─── Letter spacing ──────────────────────────────────────────────────────────
export const tracking = {
  heading: 1.2,  // approx 0.08em at 15px
  tight:   0.4,
  normal:  0,
} as const;
