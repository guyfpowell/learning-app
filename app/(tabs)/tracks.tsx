import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { ActiveTrackHero } from '@/components/tracks/ActiveTrackHero';
import { TrackRow } from '@/components/tracks/TrackRow';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { useSkills, usePaths, useEnroll, useSetActivePath } from '@/hooks/useTrack';
import type { ActivePathRef, SkillWithAccess, UserPath } from '@learning/shared';
import { extractError } from '@/lib/errors';
import { capitalize } from '@/lib/capitalize';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import { HOME_ROUTE, trackRoute } from '@/lib/routes';

// Display-only labels. `category` is free text (web admin can create others), so
// callers must fall back to the raw value for anything not listed here.
const categoryLabel: Record<string, string> = {
  'product-management': 'Product',
  'ai-engineering':     'AI Eng',
  'business':           'Business',
};

/** What a track row offers: exactly one of these, decided by enrolment first, then access. */
type SkillAction = 'make-active' | 'upgrade' | 'enrol';

function skillAction(isEnrolled: boolean, isLocked: boolean): SkillAction {
  if (isEnrolled) return 'make-active';
  if (isLocked) return 'upgrade';
  return 'enrol';
}

export default function TracksScreen() {
  const router = useRouter();
  const { data: skills, isLoading: skillsLoading, isError: skillsError, error: skillsErr } = useSkills();
  const { data: paths, isLoading: pathsLoading, isError: pathsError, error: pathsErr } = usePaths();
  const enroll = useEnroll();
  const setActive = useSetActivePath();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const isLoading = skillsLoading || pathsLoading;
  // The screen groups by what the learner can do: the active path as the hero, the paths they have
  // joined (to switch to), and the catalogue to explore. A custom path is joined by definition.
  const trackPaths = paths?.filter((p) => p.kind === 'track') ?? [];
  const enrolledSkillIds = new Set(trackPaths.map((p) => p.id));
  const customPaths = paths?.filter((p) => p.kind === 'custom') ?? [];
  const activeCustom = customPaths.find((p) => p.isActive);
  const activeTrack = trackPaths.find((p) => p.isActive);
  const activeSkill = skills?.find((s) => s.id === activeTrack?.id);
  const otherCustomPaths = customPaths.filter((p) => !p.isActive);
  const otherEnrolledSkills = skills?.filter((s) => enrolledSkillIds.has(s.id) && s.id !== activeTrack?.id) ?? [];
  const exploreSkills = skills?.filter((s) => !enrolledSkillIds.has(s.id)) ?? [];
  const hasYourTracks = !!activeCustom || !!activeTrack || otherCustomPaths.length + otherEnrolledSkills.length > 0;
  const isSwitchingTo = (ref: ActivePathRef) =>
    setActive.isPending && setActive.variables?.kind === ref.kind && setActive.variables.id === ref.id;

  const skillIds = (id: string) => ({
    tap: `skill-card-tap-${id}`, card: `skill-card-${id}`, name: `skill-name-${id}`, headline: `skill-headline-${id}`,
  });
  const customIds = (id: string) => ({
    tap: `custom-path-tap-${id}`, card: `custom-path-card-${id}`, headline: `custom-path-description-${id}`,
  });

  function skillRow(skill: SkillWithAccess) {
    const isLocked = !skill.userHasAccess;
    const action = skillAction(enrolledSkillIds.has(skill.id), isLocked);
    return (
      <TrackRow
        key={skill.id}
        ids={skillIds(skill.id)}
        tapLabel={`View ${skill.name} track details`}
        onOpen={() => router.push(trackRoute('track', skill.id))}
        eyebrow={categoryLabel[skill.category] ?? skill.category}
        name={skill.name}
        headline={skill.headline}
        dimmed={isLocked}
        action={
          <>
            {action === 'make-active' && (
              <Button
                testID={`make-active-btn-${skill.id}`}
                label="Make active"
                variant="outline"
                inline
                loading={isSwitchingTo({ kind: 'track', id: skill.id })}
                onPress={() => setActive.mutate({ kind: 'track', id: skill.id })}
              />
            )}
            {action === 'upgrade' && (
              <Button
                testID={`upgrade-btn-${skill.id}`}
                label="🔒 Upgrade"
                variant="outline"
                inline
                onPress={() => setPremiumModalVisible(true)}
              />
            )}
            {action === 'enrol' && (
              <Button
                testID={`enrol-btn-${skill.id}`}
                label="Enrol"
                inline
                loading={enroll.isPending && enroll.variables === skill.id}
                onPress={() => enroll.mutate(skill.id, { onSuccess: () => router.push(HOME_ROUTE) })}
              />
            )}
          </>
        }
      />
    );
  }

  function customRow(path: UserPath) {
    return (
      <TrackRow
        key={`${path.kind}-${path.id}`}
        ids={customIds(path.id)}
        tapLabel={`View ${path.name} details`}
        onOpen={() => router.push(trackRoute(path.kind, path.id))}
        eyebrow="Albert"
        eyebrowMark={<AlbertMark />}
        name={capitalize(path.name)}
        headline={path.description ? capitalize(path.description) : null}
        action={
          <Button
            testID={`make-active-btn-${path.id}`}
            label="Make active"
            variant="outline"
            inline
            loading={isSwitchingTo({ kind: path.kind, id: path.id })}
            onPress={() => setActive.mutate({ kind: path.kind, id: path.id })}
          />
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={TAB_SCREEN_EDGES}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]}>
        {isLoading && (
          <View testID="tracks-loading">
            <Spinner fullScreen />
          </View>
        )}

        {(skillsError || pathsError) && !isLoading && (
          <View testID="tracks-load-error">
            <Text style={styles.errorText}>{extractError(skillsErr ?? pathsErr)}</Text>
          </View>
        )}

        {enroll.isError && (
          <View testID="tracks-enrol-error">
            <Text style={styles.errorText}>{extractError(enroll.error)}</Text>
          </View>
        )}

        {setActive.isError && (
          <View testID="tracks-set-active-error">
            <Text style={styles.errorText}>{extractError(setActive.error)}</Text>
          </View>
        )}

        {!isLoading && hasYourTracks && (
          <View testID="your-tracks-section" style={styles.section}>
            {activeCustom && (
              <ActiveTrackHero
                ids={customIds(activeCustom.id)}
                activeTestID={`active-badge-${activeCustom.id}`}
                mark={<AlbertMark color={colors.onBrand} />}
                tapLabel={`View ${activeCustom.name} details`}
                onOpen={() => router.push(trackRoute(activeCustom.kind, activeCustom.id))}
                name={capitalize(activeCustom.name)}
                headline={activeCustom.description ? capitalize(activeCustom.description) : null}
              />
            )}
            {activeTrack && (
              <ActiveTrackHero
                ids={skillIds(activeTrack.id)}
                activeTestID={`active-badge-${activeTrack.id}`}
                tapLabel={`View ${activeSkill?.name ?? activeTrack.name} track details`}
                onOpen={() => router.push(trackRoute('track', activeTrack.id))}
                name={activeSkill?.name ?? activeTrack.name}
                headline={activeSkill?.headline ?? activeTrack.description}
              />
            )}
            {otherCustomPaths.length + otherEnrolledSkills.length > 0 && (
              <>
                <Text style={styles.sectionHeading}>Your tracks</Text>
                {otherCustomPaths.map(customRow)}
                {otherEnrolledSkills.map(skillRow)}
              </>
            )}
          </View>
        )}

        {!isLoading && (
          <Pressable
            testID="albert-cta"
            accessibilityRole="link"
            onPress={() => router.push('/(tabs)/albert')}
            style={styles.albertCta}
          >
            <Text style={styles.albertCtaText}>
              Want something built around your goals? <Text style={styles.albertCtaLink}>Ask Albert.</Text>
            </Text>
          </Pressable>
        )}

        {!isLoading && exploreSkills.length > 0 && (
          <View testID="explore-section">
            <Text style={styles.sectionHeading}>Explore</Text>
            {exploreSkills.map(skillRow)}
          </View>
        )}
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => { setPremiumModalVisible(false); router.push(PAYWALL_ROUTE); }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.md, flexGrow: 1 },
  errorText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  section: { marginBottom: spacing.sm },
  sectionHeading: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.base,
    color:        colors.textStrong,
    marginBottom: spacing.sm,
  },
  albertCta: { marginBottom: spacing.lg },
  albertCtaText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  albertCtaLink: {
    fontFamily: font.semibold,
    color:      colors.brand,
  },
});
