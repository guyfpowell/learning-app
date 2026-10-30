import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';
import type { TrackEntryIds } from '@/components/tracks/TrackRow';

interface ActiveTrackHeroProps {
  ids: TrackEntryIds;
  /** The testID of the "Active" label. */
  activeTestID: string;
  /** Sits at the top right: Albert's mark on an Albert path. */
  mark?: ReactNode;
  tapLabel: string;
  onOpen: () => void;
  name: string;
  headline?: string | null;
}

/** The learner's one active track, as the screen's cobalt hero. */
export function ActiveTrackHero({ ids, activeTestID, mark, tapLabel, onOpen, name, headline }: ActiveTrackHeroProps) {
  return (
    <Pressable testID={ids.tap} onPress={onOpen} accessibilityRole="button" accessibilityLabel={tapLabel}>
      <View testID={ids.card} style={styles.hero}>
        <View style={styles.eyebrows}>
          <Text testID={activeTestID} style={styles.eyebrow}>Active</Text>
          {mark}
        </View>
        <Text testID={ids.name} style={styles.name}>{name}</Text>
        {!!headline && (
          <Text testID={ids.headline} numberOfLines={2} style={styles.headline}>{headline}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.brand,
    borderRadius:    radius.card,
    padding:         spacing.lg,
    gap:             spacing.sm,
    marginBottom:    spacing.lg,
    ...shadow.brand,
  },
  eyebrows: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: {
    fontFamily:    font.bold,
    fontSize:      fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color:         colors.onBrand,
  },
  name: {
    fontFamily:    font.display,
    fontSize:      fontSize.lg,
    letterSpacing: tracking.tight,
    color:         colors.onBrand,
  },
  headline: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.brandSoft,
  },
});
