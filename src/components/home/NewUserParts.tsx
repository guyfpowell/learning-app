import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { TrackIcon } from '@/components/ui/TrackIcon';
import { useSkills } from '@/hooks/useTrack';
import { useCurrentUser } from '@/hooks/useEmailVerification';
import { suggestedTracks } from '@/lib/newUserTracks';
import { TRACKS_ROUTE, trackRoute } from '@/lib/routes';
import { colors, font } from '@/theme';

/** The person's first name, or undefined while the user has not loaded. */
export function useFirstName(): string | undefined {
  const { data: user } = useCurrentUser();
  return user?.name?.trim().split(/\s+/)[0];
}

/** A section heading in the new-user pages (24pt). */
export function NewUserHeading({ children }: { children: string }) {
  return <Text style={styles.heading}>{children}</Text>;
}

/** Three real tracks, an AI one first, each opening its track page, and a link to all of them. */
export function NewUserTracks({ heading }: { heading: string }) {
  const router = useRouter();
  const { data: skills } = useSkills();
  return (
    <View style={styles.block}>
      <NewUserHeading>{heading}</NewUserHeading>
      <View>
        {suggestedTracks(skills).map(skill => (
          <Pressable
            key={skill.id}
            testID={`new-user-track-${skill.id}`}
            onPress={() => router.push(trackRoute('track', skill.id))}
            accessibilityRole="button"
            accessibilityLabel={`Open ${skill.name}`}
            style={styles.trackRow}
          >
            <View style={styles.trackTile}>
              <TrackIcon trackId={skill.trackId} size={20} color={colors.brand} />
            </View>
            <View style={styles.trackText}>
              <Text style={styles.trackName}>{skill.name}</Text>
              {!!skill.headline && <Text style={styles.trackHeadline} numberOfLines={2}>{skill.headline}</Text>}
            </View>
            <Icon name="forward" size={18} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        ))}
      </View>
      <Pressable testID="new-user-browse-btn" onPress={() => router.push(TRACKS_ROUTE)} accessibilityRole="button" style={styles.browse}>
        <Text style={styles.link}>{skills?.length ? `See all ${skills.length} tracks` : 'See all tracks'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block:   { gap: 12 },
  heading: { fontFamily: font.black, fontSize: 24, letterSpacing: -0.03 * 24, color: colors.textStrong },
  trackRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             14,
    paddingVertical: 13,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
  },
  trackTile:     { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  trackText:     { flex: 1, gap: 2 },
  trackName:     { fontFamily: font.extrabold, fontSize: 16, letterSpacing: -0.01 * 16, color: colors.textStrong },
  trackHeadline: { fontFamily: font.regular, fontSize: 13, lineHeight: 13 * 1.35, color: colors.textMuted },
  browse: { paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  link:   { fontFamily: font.extrabold, fontSize: 15, color: colors.brand },
});
