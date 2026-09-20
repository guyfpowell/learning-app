import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PathCard } from '@/components/ui/PathCard';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { useSkills, usePaths, useEnroll, useSetActivePath, useSkipLesson, useSkipTopic, useSkipLevel } from '@/hooks/useTrack';
import { extractError } from '@/lib/errors';
import type { SkillWithAccess } from '@learning/shared';

const categoryLabel: Record<SkillWithAccess['category'], string> = {
  'product-management': 'Product',
  'ai-engineering':     'AI Eng',
  'business':           'Business',
};

export default function TracksScreen() {
  const router = useRouter();
  const { data: skills, isLoading: skillsLoading, isError: skillsError, error: skillsErr } = useSkills();
  const { data: paths, isLoading: pathsLoading, isError: pathsError, error: pathsErr } = usePaths();
  const enroll = useEnroll();
  const setActive = useSetActivePath();
  const skipLesson = useSkipLesson();
  const skipTopic = useSkipTopic();
  const skipLevel = useSkipLevel();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const isLoading = skillsLoading || pathsLoading;
  // This screen is the catalogue of predefined tracks, so it reads only the track
  // paths. That is a property of what the screen is for, not a kind filter on
  // rendering — a custom path has no catalogue entry to mark.
  const trackPaths = paths?.filter((p) => p.kind === 'track') ?? [];
  const enrolledSkillIds = new Set(trackPaths.map((p) => p.id));
  // Custom paths are owned by Albert's builder but live here too, so a user who
  // built one can find it. Rendered with the same PathCard as everywhere else.
  const customPaths = paths?.filter((p) => p.kind === 'custom') ?? [];
  const activeSkillId = trackPaths.find((p) => p.isActive)?.id ?? null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Tracks</Text>

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

        {!isLoading && customPaths.length > 0 && (
          <View testID="your-paths-section" style={styles.section}>
            <Text style={styles.sectionHeading}>Your paths</Text>
            {customPaths.map((path) => (
              /* The whole path entry is tappable → navigates to the detail screen.
                 Buttons inside PathCard (Start Lesson, Skip Topic, etc.) steal the
                 touch event, so no explicit stopPropagation is needed (RN responder). */
              <Pressable
                key={`${path.kind}-${path.id}`}
                testID={`custom-path-tap-${path.id}`}
                onPress={() => router.push(`/(tabs)/track/${path.kind}/${path.id}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`View ${path.name} details`}
              >
                <PathCard
                  path={path}
                  onStartLesson={(id) => router.push(`/(tabs)/lesson/${id}` as never)}
                  onSkipLesson={(p) => skipLesson.mutate({ kind: p.kind, id: p.id })}
                  onSkipTopic={(p) => skipTopic.mutate({ kind: p.kind, id: p.id })}
                  onSkipLevel={(p) => skipLevel.mutate({ kind: p.kind, id: p.id })}
                  skipLessonPending={skipLesson.isPending}
                  skipTopicPending={skipTopic.isPending}
                  skipLevelPending={skipLevel.isPending}
                />
              </Pressable>
            ))}
          </View>
        )}

        {!isLoading && (
          <Pressable
            testID="albert-cta"
            accessibilityRole="link"
            onPress={() => router.push('/(tabs)/albert' as never)}
            style={styles.albertCta}
          >
            <Text style={styles.albertCtaText}>
              Want something built around your goals? <Text style={styles.albertCtaLink}>Ask Albert.</Text>
            </Text>
          </Pressable>
        )}

        {!isLoading && <Text style={styles.sectionHeading}>Pre-built tracks</Text>}

        {!isLoading && skills?.map((skill) => {
          const isEnrolled = enrolledSkillIds.has(skill.id);
          const isActiveMark = activeSkillId === skill.id;
          const isLocked = !skill.userHasAccess;
          const totalHours = skill.skillPaths.reduce((sum, p) => sum + p.durationHours, 0);

          return (
            /* The whole card is tappable → navigates to track detail.
               Buttons inside the Card (Enrol, Make active, Upgrade) steal the touch
               event automatically (RN responder system), so no stopPropagation is needed. */
            <Pressable
              key={skill.id}
              testID={`skill-card-tap-${skill.id}`}
              onPress={() => router.push(`/(tabs)/track/track/${skill.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`View ${skill.name} track details`}
            >
              <Card testID={`skill-card-${skill.id}`} style={styles.card}>
                <View style={styles.badgeRow}>
                  <Badge label={categoryLabel[skill.category]} variant="info" />
                  {isEnrolled && (
                    <View testID={`enrolled-badge-${skill.id}`}>
                      <Badge label="Enrolled" variant="success" />
                    </View>
                  )}
                  {isActiveMark && (
                    <View testID={`active-badge-${skill.id}`}>
                      <Badge label="Active" variant="info" />
                    </View>
                  )}
                  {isLocked && (
                    <View testID={`locked-badge-${skill.id}`}>
                      <Badge label="🔒 Premium" variant="warning" />
                    </View>
                  )}
                </View>

                <Text
                  testID={`skill-name-${skill.id}`}
                  style={[styles.skillName, isLocked && styles.lockedText]}
                >
                  {skill.name}
                </Text>
                <Text style={[styles.skillHours, isLocked && styles.lockedText]}>
                  {totalHours} hrs
                </Text>

                {isEnrolled ? (
                  isActiveMark ? (
                    <Text testID={`active-text-${skill.id}`} style={styles.activeText}>
                      Active track
                    </Text>
                  ) : (
                    <>
                      <Text testID={`enrolled-text-${skill.id}`} style={styles.enrolledText}>
                        Currently enrolled
                      </Text>
                      <Button
                        testID={`make-active-btn-${skill.id}`}
                        label="Make active"
                        loading={setActive.isPending && setActive.variables?.id === skill.id}
                        style={styles.makeActiveBtn}
                        onPress={() => setActive.mutate({ kind: 'track', id: skill.id })}
                      />
                    </>
                  )
                ) : isLocked ? (
                  <Button
                    testID={`upgrade-btn-${skill.id}`}
                    label="🔒 Upgrade"
                    style={styles.lockedBtn}
                    onPress={() => setPremiumModalVisible(true)}
                  />
                ) : (
                  <Button
                    testID={`enrol-btn-${skill.id}`}
                    label="Enrol"
                    loading={enroll.isPending && enroll.variables === skill.id}
                    onPress={() => enroll.mutate(skill.id, { onSuccess: () => router.push('/(tabs)/lessons') })}
                  />
                )}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => { setPremiumModalVisible(false); router.push('/(tabs)/profile'); }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.md, flexGrow: 1 },
  heading: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.xl,
    color:        colors.textStrong,
    marginBottom: spacing.lg,
  },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  badgeRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.xs,
  },
  skillName: {
    fontFamily: font.semibold,
    fontSize:   fontSize.md,
    color:      colors.textStrong,
  },
  skillHours: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  lockedText: {
    color: colors.textMuted,
  },
  enrolledText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.success,
  },
  activeText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.brand,
  },
  lockedBtn: {
    backgroundColor: colors.borderSubtle,
  },
  makeActiveBtn: {
    backgroundColor: colors.brand,
  },
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
