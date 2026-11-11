import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { HeroBackground } from '@/components/ui/HeroBackground';
import { colors, font, fontSize, radius, shadow, spacing, trackingEm } from '@/theme';
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
          <Icon name="forward" size={fontSize.lg} color={colors.onBrand} strokeWidth={2.4} />
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
    overflow:     'hidden',
    borderRadius: radius.xl,
    padding:      spacing.lg,
    gap:          spacing.sm,
    marginBottom: spacing.md,
    ...shadow.brand,
  },
  eyebrows: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: {
    fontFamily:    font.extrabold,
    fontSize:      fontSize.sm,
    letterSpacing: trackingEm.caps * fontSize.sm,
    textTransform: 'uppercase',
    color:         colors.brandSoft,
  },
  name: {
    fontFamily:    font.black,
    fontSize:      fontSize.xl + 6,
    letterSpacing: trackingEm.display * (fontSize.xl + 6),
    color:         colors.onBrand,
  },
  headline: {
    fontFamily: font.regular,
    fontSize:   fontSize.md,
    color:      colors.brandSoft,
  },
});
