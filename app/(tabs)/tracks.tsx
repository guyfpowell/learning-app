import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useSkills, useEnrollments, useEnroll } from '@/hooks/useTrack';
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
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  const isLoading = skillsLoading || enrollmentsLoading;
  const enrolledSkillIds = new Set(enrollments?.map((e) => e.skillId) ?? []);

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

        {!isLoading && skills?.map((skill) => {
          const isEnrolled = enrolledSkillIds.has(skill.id);
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
                <Text testID={`enrolled-text-${skill.id}`} style={styles.enrolledText}>
                  Currently enrolled
                </Text>
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
  lockedBtn: {
    backgroundColor: colors.border,
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
