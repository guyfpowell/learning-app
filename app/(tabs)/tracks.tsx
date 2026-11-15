import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, press, spacing } from '@/theme';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { TextAction } from '@/components/tracks/TextAction';
import { TrackIcon } from '@/components/ui/TrackIcon';
import { sectionHeadingStyle } from '@/components/ui/sectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { ActiveTrackHero } from '@/components/tracks/ActiveTrackHero';
import { TrackRow } from '@/components/tracks/TrackRow';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { useSkills, usePaths, useEnroll, useSetActivePath } from '@/hooks/useTrack';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';
import type { ActivePathRef, SkillWithAccess, UserPath } from '@learning/shared';
import { extractError } from '@/lib/errors';
import { capitalize } from '@/lib/capitalize';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import { HOME_ROUTE, trackRoute } from '@/lib/routes';

const GLYPH_SIZE = 23;
// The Albert card's mark, a point smaller than a track glyph in the design.
const ALBERT_CTA_GLYPH_SIZE = 22;
// How long the "could not make active" toast stays up before it clears itself.
const FAILURE_TOAST_MS = 4000;
// Side gutters, the same as Home's.
const TRACKS_GUTTER = spacing.md + spacing.xs;
// The design's 22 above a section heading: there is no 22 token.
const SECTION_HEADING_GAP = 22;

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

const skillIds = (id: string) => ({
  tap: `skill-card-tap-${id}`, card: `skill-card-${id}`, name: `skill-name-${id}`, headline: `skill-headline-${id}`,
});
const customIds = (id: string) => ({
  tap: `custom-path-tap-${id}`, card: `custom-path-card-${id}`, headline: `custom-path-description-${id}`,
});

/** What the screen shows, grouped by what the learner can do. */
interface TrackSections {
  enrolledSkillIds: Set<string>;
  activeCustom: UserPath | undefined;
  activeTrack: UserPath | undefined;
  /** The catalogue entry for `activeTrack`, for its name and headline. */
  activeSkill: SkillWithAccess | undefined;
  otherCustomPaths: UserPath[];
  otherEnrolledSkills: SkillWithAccess[];
  exploreSkills: SkillWithAccess[];
  hasCustomPath: boolean;
  hasOtherTracks: boolean;
  hasYourTracks: boolean;
}

/**
 * The active path as the hero, the paths the learner has joined (to switch to), and the
 * catalogue to explore. A custom path is joined by definition.
 */
function groupTracks(skills: SkillWithAccess[] | undefined, paths: UserPath[] | undefined): TrackSections {
  const trackPaths = paths?.filter((p) => p.kind === 'track') ?? [];
  const enrolledSkillIds = new Set(trackPaths.map((p) => p.id));
  const customPaths = paths?.filter((p) => p.kind === 'custom') ?? [];
  const activeCustom = customPaths.find((p) => p.isActive);
  const activeTrack = trackPaths.find((p) => p.isActive);
  const otherCustomPaths = customPaths.filter((p) => !p.isActive);
  const otherEnrolledSkills = skills?.filter((s) => enrolledSkillIds.has(s.id) && s.id !== activeTrack?.id) ?? [];
  const hasOtherTracks = otherCustomPaths.length + otherEnrolledSkills.length > 0;
  return {
    enrolledSkillIds,
    activeCustom,
    activeTrack,
    activeSkill: skills?.find((s) => s.id === activeTrack?.id),
    otherCustomPaths,
    otherEnrolledSkills,
    exploreSkills: skills?.filter((s) => !enrolledSkillIds.has(s.id)) ?? [],
    hasCustomPath: customPaths.length > 0,
    hasOtherTracks,
    hasYourTracks: !!activeCustom || !!activeTrack || hasOtherTracks,
  };
}

export default function TracksScreen() {
  const router = useRouter();
  const { data: skills, isLoading: skillsLoading, isError: skillsError, error: skillsErr } = useSkills();
  const { data: paths, isLoading: pathsLoading, isError: pathsError, error: pathsErr } = usePaths();
  const enroll = useEnroll();
  const { setActive, isPendingFor, failure, dismissFailure } = useSetActivePath();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const isLoading = skillsLoading || pathsLoading;
  const {
    enrolledSkillIds, activeCustom, activeTrack, activeSkill, otherCustomPaths, otherEnrolledSkills, exploreSkills,
    hasCustomPath, hasOtherTracks, hasYourTracks,
  } = groupTracks(skills, paths);
  useAutoDismiss(failure, dismissFailure, FAILURE_TOAST_MS);

  /** The compact white button that switches the active path. */
  function makeActiveButton(id: string, ref: ActivePathRef) {
    return (
      <EdgeButton
        testID={`make-active-btn-${id}`}
        look={{ face: colors.white, label: colors.textStrong, edge: press.secondaryEdge }}
        label="Make active"
        compact
        onPress={() => { if (!isPendingFor(ref)) setActive(ref); }}
      />
    );
  }

  function skillRow(skill: SkillWithAccess) {
    const isLocked = !skill.userHasAccess;
    const action = skillAction(enrolledSkillIds.has(skill.id), isLocked);
    return (
      <TrackRow
        key={skill.id}
        ids={skillIds(skill.id)}
        tapLabel={`View ${skill.name} track details`}
        onOpen={() => router.push(trackRoute('track', skill.id))}
        glyph={<TrackIcon trackId={skill.trackId} size={GLYPH_SIZE} color={isLocked ? colors.textMuted : colors.textStrong} />}
        eyebrow={categoryLabel[skill.category] ?? skill.category}
        name={skill.name}
        headline={skill.headline}
        dimmed={isLocked}
        action={
          <>
            {action === 'make-active' && makeActiveButton(skill.id, { kind: 'track', id: skill.id })}
            {action === 'upgrade' && (
              <TextAction
                testID={`upgrade-btn-${skill.id}`}
                label="Upgrade"
                icon={<Icon name="locked" size={fontSize.md} color={colors.textStrong} strokeWidth={2.2} />}
                color={colors.textStrong}
                onPress={() => setPremiumModalVisible(true)}
              />
            )}
            {action === 'enrol' && (
              <TextAction
                testID={`enrol-btn-${skill.id}`}
                label="Enrol"
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
        glyph={<AlbertMark size={GLYPH_SIZE} />}
        eyebrow="Albert path"
        eyebrowAccent
        name={capitalize(path.name)}
        headline={path.description ? capitalize(path.description) : null}
        action={makeActiveButton(path.id, { kind: path.kind, id: path.id })}
      />
    );
  }

  // Only for a learner with no Albert path: once they have one, it is already above.
  const showAlbertCta = !hasCustomPath;

  /** Points someone browsing the catalogue to Albert, in the same card as a track. */
  function albertRow() {
    const openAlbert = () => router.push('/(tabs)/albert');
    return (
      <TrackRow
        ids={{ tap: 'albert-cta', card: 'albert-cta-card', name: 'albert-cta-name', headline: 'albert-cta-headline' }}
        tapLabel="Ask Albert to build a path around your goals"
        onOpen={openAlbert}
        glyph={<AlbertMark size={ALBERT_CTA_GLYPH_SIZE} />}
        prompt
        name="Want something built around your goals?"
        headline={null}
        action={<TextAction testID="albert-cta-btn" label="Ask Albert" onPress={openAlbert} />}
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

        {!isLoading && hasYourTracks && (
          <View testID="your-tracks-section" style={styles.section}>
            {activeCustom && (
              <ActiveTrackHero
                ids={customIds(activeCustom.id)}
                activeTestID={`active-badge-${activeCustom.id}`}
                mark={<AlbertMark variant="onBrand" />}
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
            {showAlbertCta && albertRow()}
            {hasOtherTracks && <Text style={styles.sectionHeading}>Your tracks</Text>}
            {otherCustomPaths.map(customRow)}
            {otherEnrolledSkills.map(skillRow)}
          </View>
        )}

        {!isLoading && (exploreSkills.length > 0 || (showAlbertCta && !hasYourTracks)) && (
          <View testID="explore-section">
            {showAlbertCta && !hasYourTracks && albertRow()}
            {exploreSkills.length > 0 && <Text style={styles.sectionHeading}>Explore</Text>}
            {exploreSkills.map(skillRow)}
          </View>
        )}
      </ScrollView>

      {failure && (
        <View testID="set-active-toast" style={styles.toast}>
          <Toast visible variant="error" message={failure} onDismiss={dismissFailure} />
        </View>
      )}

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
  content:   { paddingHorizontal: TRACKS_GUTTER, paddingTop: spacing.md, flexGrow: 1 },
  errorText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  section: { marginBottom: spacing.sm },
  toast:   { position: 'absolute', start: spacing.md, end: spacing.md, bottom: TAB_BAR_CLEARANCE },
  sectionHeading: {
    ...sectionHeadingStyle,
    paddingHorizontal: spacing.xs,
    marginTop:         SECTION_HEADING_GAP,
    marginBottom:      spacing.xs,
  },
});
