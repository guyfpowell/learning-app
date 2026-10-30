import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';

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
  /** A small caps line above the name (the category, or "Albert"). */
  eyebrow?: string;
  /** Sits before the eyebrow text: Albert's mark on an Albert path. */
  eyebrowMark?: ReactNode;
  name: string;
  headline?: string | null;
  /** Muted text, for a track the learner can't open yet. */
  dimmed?: boolean;
  /** The one button on the right. A button inside wins its own tap, so the row doesn't open. */
  action: ReactNode;
}

/** A compact catalogue entry: name and headline on the left, one action on the right. */
export function TrackRow({ ids, tapLabel, onOpen, eyebrow, eyebrowMark, name, headline, dimmed, action }: TrackRowProps) {
  return (
    <Pressable testID={ids.tap} onPress={onOpen} accessibilityRole="button" accessibilityLabel={tapLabel}>
      <View testID={ids.card} style={styles.row}>
        <View style={styles.text}>
          {!!eyebrow && (
            <View style={styles.eyebrowRow}>
              {!!eyebrowMark && <View testID="track-eyebrow-mark" style={styles.eyebrowMark}>{eyebrowMark}</View>}
              <Text style={styles.eyebrow}>{eyebrow}</Text>
            </View>
          )}
          <Text testID={ids.name} style={styles.name}>{name}</Text>
          {!!headline && (
            <Text testID={ids.headline} numberOfLines={2} style={[styles.headline, dimmed && styles.dimmed]}>
              {headline}
            </Text>
          )}
        </View>
        <View style={styles.action}>{action}</View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.borderSubtle,
    borderRadius:    radius.md,
    ...shadow.xs,
  },
  text:     { flex: 1, gap: spacing.xs },
  // The icon's box sits low against the caps text, so it is lifted 2px.
  eyebrowMark: { transform: [{ translateY: -spacing.xs / 2 }] },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: {
    fontFamily:    font.bold,
    fontSize:      fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color:         colors.textMuted,
  },
  name: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  headline: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  dimmed: { color: colors.textMuted },
  action: { alignItems: 'flex-end' },
});
