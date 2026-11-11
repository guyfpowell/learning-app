import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, font, fontSize, spacing, tracking, trackingEm } from '@/theme';

/** The testIDs a track entry carries, so each kind of entry keeps its own. */
export interface TrackEntryIds {
  tap: string;
  card: string;
  name?: string;
  headline?: string;
}

interface TrackRowProps {
  ids: TrackEntryIds;
  /** Accessible name of the whole tappable row. */
  tapLabel: string;
  onOpen: () => void;
  /** The track's glyph, in its own column before the text. */
  glyph: ReactNode;
  /** A small caps line above the name (the category, or "Albert path"). */
  eyebrow?: string;
  /** Draws the eyebrow in cobalt: an Albert path. */
  eyebrowAccent?: boolean;
  name: string;
  headline?: string | null;
  /** Muted text, for a track the learner can't open yet. */
  dimmed?: boolean;
  /** The one action on the right. A button inside wins its own tap, so the row doesn't open. */
  action: ReactNode;
}

/** A list entry with a rule under it: glyph, name and headline, one action on the right. */
export function TrackRow({ ids, tapLabel, onOpen, glyph, eyebrow, eyebrowAccent, name, headline, dimmed, action }: TrackRowProps) {
  return (
    <Pressable testID={ids.tap} onPress={onOpen} accessibilityRole="button" accessibilityLabel={tapLabel}>
      <View testID={ids.card} style={styles.row}>
        <View style={styles.glyph}>{glyph}</View>
        <View style={styles.text}>
          {!!eyebrow && <Text style={[styles.eyebrow, eyebrowAccent && styles.accent]}>{eyebrow}</Text>}
          <Text testID={ids.name} style={[styles.name, dimmed && styles.dimmedName]}>{name}</Text>
          {!!headline && (
            <Text testID={ids.headline} numberOfLines={2} style={styles.headline}>{headline}</Text>
          )}
        </View>
        <View style={styles.action}>{action}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  glyph: { width: 28, alignItems: 'center' },
  text:  { flex: 1, gap: spacing.xs / 2 },
  eyebrow: {
    fontFamily:    font.extrabold,
    fontSize:      fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color:         colors.textMuted,
  },
  accent: { color: colors.textLink },
  name: {
    fontFamily:    font.extrabold,
    fontSize:      fontSize.md + 2,
    letterSpacing: trackingEm.heading * (fontSize.md + 2),
    color:         colors.textStrong,
  },
  dimmedName: { color: colors.textMuted },
  headline: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
  },
  action: { alignItems: 'flex-end' },
});
