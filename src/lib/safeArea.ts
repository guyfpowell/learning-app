import type { Edge } from 'react-native-safe-area-context';
import { spacing } from '@/theme';

/**
 * The safe-area edges a tab screen applies. The `(tabs)` layout owns the top inset (the verification
 * banner) and the tab bar owns the bottom one, so a screen adding `bottom` leaves a blank band above the bar.
 */
export const TAB_SCREEN_EDGES: readonly Edge[] = ['left', 'right'];

/** The floating tab bar's height (see `app/(tabs)/_layout.tsx`). */
export const TAB_BAR_HEIGHT = 56;

/** The most the bar sits above the bottom edge: `max(inset - sm, md) + xs`, on the tallest iPhone inset (34). */
const TAB_BAR_MAX_LIFT = 34 - spacing.sm + spacing.xs;

/**
 * The bottom padding a tab screen's scrolling content needs so its last item can scroll clear of the
 * floating tab bar (096). A fixed worst case, so a screen needs no safe-area hook.
 */
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_MAX_LIFT + spacing.md;
