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
  /** Draws the name as a plain 15pt line (the Albert prompt) rather than a 16pt title. */
  prompt?: boolean;
  /** Muted text, for a track the learner can't open yet. */
  dimmed?: boolean;
  /** The one action on the right. A button inside wins its own tap, so the row doesn't open. */
  action: ReactNode;
}

/** A list entry with a rule under it: glyph, name and headline, one action on the right. */
export function TrackRow({ ids, tapLabel, onOpen, glyph, eyebrow, eyebrowAccent, name, headline, prompt, dimmed, action }: TrackRowProps) {
  return (
    <Pressable testID={ids.tap} onPress={onOpen} accessibilityRole="button" accessibilityLabel={tapLabel}>
      <View testID={ids.card} style={[styles.row, prompt && styles.noRule]}>
        <View style={styles.glyph}>{glyph}</View>
        <View style={styles.text}>
          {!!eyebrow && <Text style={[styles.eyebrow, eyebrowAccent && styles.accent]}>{eyebrow}</Text>}
          <Text testID={ids.name} style={[styles.name, prompt && styles.prompt, dimmed && styles.dimmedName]}>{name}</Text>
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
    gap:               14,
    paddingVertical:   14,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  noRule: { borderBottomWidth: 0 },
  glyph: { width: 24, alignItems: 'center' },
  text:  { flex: 1, gap: 3 },
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
    fontSize:      fontSize.base,
    letterSpacing: trackingEm.heading * fontSize.base,
    color:         colors.textStrong,
  },
  prompt: { fontFamily: font.bold, fontSize: 15, lineHeight: 15 * 1.3, letterSpacing: 0 },
  dimmedName: { color: colors.textMuted },
  headline: {
    fontFamily: font.regular,
    fontSize:   13,
    color:      colors.textMuted,
  },
  action: { alignItems: 'flex-end' },
});
