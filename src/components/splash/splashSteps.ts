import { MARK_CHEVRONS, MARK_CHEVRON_STROKE, MARK_VIEW_BOX } from '@/assets/splashMark';

/** The splash's two animations: the square filling clockwise, or the chevrons filling upwards. */
export const SPLASH_VARIANTS = ['square', 'chevrons'] as const;
export type SplashVariant = typeof SPLASH_VARIANTS[number];

/** What every launch shows. */
export const DEFAULT_SPLASH: SplashVariant = 'square';

/** The next animation in the list, wrapping round: the dev switch's one tap. */
export function nextSplash(current: SplashVariant): SplashVariant {
  return SPLASH_VARIANTS[(SPLASH_VARIANTS.indexOf(current) + 1) % SPLASH_VARIANTS.length];
}

/** Timings in ms. The splash holds for `hold`, then fades to the screen under it. The entrances are the design's (S.03). */
export const SPLASH_MS = {
  hold: 3000,
  fadeOut: 500,
  markIn: 500,
  lowerChevronAt: 250,
  upperChevronAt: 400,
  chevronIn: 520,
  wordAt: 700,
  wordIn: 500,
  /** When the chevrons start to fill; they are full a moment before the splash fades. */
  fillAt: 300,
  fillDone: 2800,
} as const;

/** Sizes in points (design S.03), and how far below true centre the logo sits. */
export const SPLASH_SIZE = { mark: 96, gap: 22, wordWidth: 150, lift: 54, chevronRise: 14, wordRise: 6, markFrom: 0.92 } as const;

/** How faint the part not yet loaded is. */
export const SPLASH_FAINT = 0.16;

/** The strip of the mark the chevrons occupy, in points from its top: from the upper one's point to the lower one's feet, stroke included. */
export function chevronBandOf(markSize: number): { top: number; height: number } {
  const heights = Object.values(MARK_CHEVRONS).flatMap((points) => points.split(' ').map((p) => Number(p.split(',')[1])));
  const scale = markSize / MARK_VIEW_BOX;
  const top = (Math.min(...heights) - MARK_CHEVRON_STROKE / 2) * scale;
  const bottom = (Math.max(...heights) + MARK_CHEVRON_STROKE / 2) * scale;
  return { top, height: bottom - top };
}
