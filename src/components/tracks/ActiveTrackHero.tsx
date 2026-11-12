import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { HeroBackground } from '@/components/ui/HeroBackground';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';
import type { TrackEntryIds } from '@/components/tracks/TrackRow';

interface ActiveTrackHeroProps {
  ids: TrackEntryIds;
  /** The testID of the "Active" label. */
  activeTestID: string;
  /** Sits before the label: Albert's mark on an Albert path, which also adds "Albert path" to the label. */
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
        <HeroBackground level="intermediate" />
        <View style={styles.eyebrows}>
          <View style={styles.label}>
            {mark}
            <Text testID={activeTestID} style={styles.eyebrow}>{mark ? 'Active · Albert path' : 'Active'}</Text>
          </View>
        </View>
        <Text testID={ids.name} style={styles.name}>{name}</Text>
        {!!headline && (
          <Text testID={ids.headline} numberOfLines={2} style={styles.headline}>{headline}</Text>
        )}
      </View>
    </Pressable>
  );
}

const NAME_SIZE = 30;

const styles = StyleSheet.create({
  hero: {
    overflow:     'hidden',
    borderRadius: radius.xl,
    padding:      spacing.lg,
    gap:          10,
    marginBottom: spacing.md,
    // Wider than the page's gutters by 4pt a side, as on Home.
    marginHorizontal: -spacing.xs,
    ...shadow.brand,
  },
  eyebrows: { flexDirection: 'row', alignItems: 'center' },
  label:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: {
    fontFamily:    font.extrabold,
    fontSize:      fontSize.xs,
    letterSpacing: 0.1 * fontSize.xs,
    textTransform: 'uppercase',
    color:         colors.brandSoft,
  },
  name: {
    fontFamily:    font.black,
    fontSize:      NAME_SIZE,
    lineHeight:    NAME_SIZE * 1.02,
    letterSpacing: -0.035 * NAME_SIZE,
    color:         colors.onBrand,
  },
  headline: {
    fontFamily: font.regular,
    fontSize:   15,
    lineHeight: 15 * 1.4,
    color:      colors.brandSoft,
  },
});
