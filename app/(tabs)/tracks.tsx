import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useSkills, useEnrollments, useEnroll, useSetActiveTrack } from '@/hooks/useTrack';
import { extractError } from '@/lib/errors';
import type { SkillWithAccess } from '@learning/shared';

const categoryLabel: Record<SkillWithAccess['category'], string> = {
  'product-management': 'Product',
  'ai-engineering':     'AI Eng',
  'business':           'Business',
};

function PremiumModal({ visible, onClose, onUpgrade }: { visible: boolean; onClose: () => void; onUpgrade: () => void }) {
  return (
    <Modal testID="premium-modal" visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalIcon}>🔒</Text>
          <Text style={styles.modalTitle}>Premium Content</Text>
          <Text style={styles.modalBody}>
            Upgrade to unlock unlimited access to all premium tracks.
          </Text>
          <Button testID="upgrade-now-btn" label="Upgrade now" style={styles.upgradeBtn} onPress={onUpgrade} />
          <Pressable testID="dismiss-btn" onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function TracksScreen() {
  const router = useRouter();
  const { data: skills, isLoading: skillsLoading, isError: skillsError, error: skillsErr } = useSkills();
  const { data: enrollments, isLoading: enrollmentsLoading, isError: enrollmentsError, error: enrollmentsErr } = useEnrollments();
  const enroll = useEnroll();
  const setActive = useSetActiveTrack();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  // Derived, not read from the auth record: `UserAuth` carries no premium flag,
  // and adding one would change a contract BOTH clients read.
  //
  // `skill.userHasAccess` alone is NOT the signal — free users have access to
  // free tracks, so it reads as premium for everyone. Access to a skill that is
  // actually premium is the thing only a subscriber has.
  const isPremium = skills?.some(
    (sk) => sk.premiumStatus === 'premium' && sk.userHasAccess
  ) ?? false;

  const isLoading = skillsLoading || enrollmentsLoading;
  const enrolledSkillIds = new Set(enrollments?.map((e) => e.skillId) ?? []);
  const activeSkillId = enrollments?.find((e) => e.isActive)?.skillId ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Tracks</Text>

        {isLoading && (
          <View testID="tracks-loading">
            <Spinner fullScreen />
          </View>
        )}

        {(skillsError || enrollmentsError) && !isLoading && (
          <View testID="tracks-load-error">
            <Text style={styles.errorText}>{extractError(skillsErr ?? enrollmentsErr)}</Text>
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

        {/* Alongside the tracks, not a seventh tab — it is an alternative to
            picking a track, and web places it in the same grid. Premium gates
            BUILDING a path; track access itself never is. */}
        {!isLoading && (
          <Card testID="build-path-card" style={styles.card}>
            <View style={styles.badgeRow}>
              <Badge label={isPremium ? 'Albert' : 'Premium'} variant={isPremium ? 'info' : 'warning'} />
            </View>
            <Text style={styles.skillName}>Build my own path</Text>
            <Text style={styles.skillHours}>
              Tell me about your role and what you want to get better at, and I’ll
              build a path from the whole curriculum instead of a fixed track.
            </Text>
            <Button
              testID={isPremium ? 'build-path-start' : 'build-path-upgrade'}
              label={isPremium ? 'Start' : 'Upgrade to build a path'}
              variant={isPremium ? 'primary' : 'outline'}
              onPress={() => {
                if (isPremium) router.push('/build');
                else setPremiumModalVisible(true);
              }}
            />
          </Card>
        )}

        {!isLoading && skills?.map((skill) => {
          const isEnrolled = enrolledSkillIds.has(skill.id);
          const isActiveMark = activeSkillId === skill.id;
          const isLocked = !skill.userHasAccess;
          const totalHours = skill.skillPaths.reduce((sum, p) => sum + p.durationHours, 0);

          return (
            <Card key={skill.id} testID={`skill-card-${skill.id}`} style={styles.card}>
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
                      loading={setActive.isPending && setActive.variables === skill.id}
                      style={styles.makeActiveBtn}
                      onPress={() => setActive.mutate(skill.id)}
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
          );
        })}
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onUpgrade={() => { setPremiumModalVisible(false); router.push('/(tabs)/settings'); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.md, flexGrow: 1 },
  heading: {
    fontFamily:   font.bold,
    fontSize:     fontSize.xl,
    color:        colors.textDark,
    marginBottom: spacing.lg,
  },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  badgeRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.xs,
  },
  skillName: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
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
    color:      colors.teal,
  },
  lockedBtn: {
    backgroundColor: colors.border,
  },
  makeActiveBtn: {
    backgroundColor: colors.teal,
  },
  errorText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor:     colors.white,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              spacing.xl,
    gap:                  spacing.md,
    alignItems:           'center',
  },
  modalIcon: { fontSize: 48 },
  modalTitle: {
    fontFamily: font.bold,
    fontSize:   fontSize.lg,
    color:      colors.textDark,
    textAlign:  'center',
  },
  modalBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    lineHeight: fontSize.base * 1.5,
  },
  upgradeBtn: { width: '100%' },
  dismissBtn: { paddingVertical: spacing.sm },
  dismissText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
});
