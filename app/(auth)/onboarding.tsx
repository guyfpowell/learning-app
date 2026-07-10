import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSkills, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { SENIORITY_LABELS } from '@learning/shared';
import type { Seniority, SkillWithAccess } from '@learning/shared';

type Step = 1 | 2 | 3;
type PreferredTime = 'morning' | 'afternoon' | 'evening';

const SENIORITY_ORDER: Seniority[] = [
  'ASSOCIATE',
  'PRACTITIONER',
  'SENIOR',
  'LEAD',
  'DIRECTOR',
];

const PREFERRED_TIME_LABELS: Record<PreferredTime, string> = {
  morning: 'Morning (8 AM)',
  afternoon: 'Afternoon (1 PM)',
  evening: 'Evening (7 PM)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  return (
    <View style={styles.stepIndicator}>
      {([1, 2, 3] as Step[]).map((n) => (
        <View
          key={n}
          style={[styles.stepDot, step >= n && styles.stepDotActive]}
        />
      ))}
    </View>
  );
}

function SeniorityStep({
  selected,
  onSelect,
}: {
  selected: Seniority | null;
  onSelect: (s: Seniority) => void;
}) {
  return (
    <>
      <Text style={styles.stepHeading}>
        How would you describe your experience level?
      </Text>
      {SENIORITY_ORDER.map((key) => {
        const { label, years, titles } = SENIORITY_LABELS[key];
        const isSelected = selected === key;
        return (
          <Pressable
            key={key}
            testID={`seniority-${key}`}
            onPress={() => onSelect(key)}
            style={[styles.optionCard, isSelected && styles.optionCardSelected]}
          >
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {label}
              </Text>
              <Text style={styles.optionSub}>
                {years} · {titles}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

function TracksStep({
  skills,
  isLoading,
  isError,
  selectedIds,
  onToggle,
  onLockPress,
  isPremiumUser,
  premiumTrackSkipped,
}: {
  skills: SkillWithAccess[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onLockPress: () => void;
  isPremiumUser: boolean;
  premiumTrackSkipped: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.centered} testID="tracks-loading">
        <Text style={styles.loadingText}>Loading tracks…</Text>
      </View>
    );
  }

  if (isError || !skills) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Failed to load tracks. Please try again.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.stepHeading}>Which tracks do you want to learn?</Text>
      <Text style={styles.stepSub}>
        {isPremiumUser
          ? 'Choose as many tracks as you like.'
          : 'Choose one track to get started. Upgrade to unlock all tracks.'}
      </Text>
      {skills.map((skill) => {
        const isSelected = selectedIds.includes(skill.id);
        const isLocked = !skill.userHasAccess;
        return (
          <Pressable
            key={skill.id}
            testID={`skill-${skill.id}`}
            onPress={() => {
              onToggle(skill.id);
              if (isLocked && !isSelected) onLockPress();
            }}
            style={[
              styles.optionCard,
              isSelected && styles.optionCardSelected,
            ]}
          >
            {isPremiumUser ? (
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            ) : (
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            )}
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>
                {skill.name}
              </Text>
              {isLocked && (
                <Text testID={`skill-locked-${skill.id}`} style={styles.lockBadge}>
                  🔒 Premium
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
      {premiumTrackSkipped && (
        <View style={styles.infoBanner} testID="premium-track-info-banner">
          <Text style={styles.infoBannerText}>
            You'll get a limited preview of premium tracks until you upgrade.
          </Text>
        </View>
      )}
    </>
  );
}

function TimezoneStep({
  timezone,
  onTimezoneChange,
  preferredTime,
  onPreferredTimeChange,
}: {
  timezone: string;
  onTimezoneChange: (v: string) => void;
  preferredTime: PreferredTime;
  onPreferredTimeChange: (v: PreferredTime) => void;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>Timezone</Text>
      <TextInput
        testID="timezone-input"
        style={styles.textInput}
        value={timezone}
        onChangeText={onTimezoneChange}
        placeholder="UTC, America/New_York, etc."
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
        Preferred learning time
      </Text>
      {(Object.entries(PREFERRED_TIME_LABELS) as [PreferredTime, string][]).map(
        ([key, label]) => {
          const isSelected = preferredTime === key;
          return (
            <Pressable
              key={key}
              testID={`preferred-time-${key}`}
              onPress={() => onPreferredTimeChange(key)}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
            >
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {label}
              </Text>
            </Pressable>
          );
        }
      )}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: skills, isLoading: skillsLoading, isError: skillsError } = useSkills();
  const complete = useCompleteOnboarding();

  const [step, setStep] = useState<Step>(1);
  const [seniority, setSeniority] = useState<Seniority | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [preferredTime, setPreferredTime] = useState<PreferredTime>('morning');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [premiumTrackSkipped, setPremiumTrackSkipped] = useState(false);

  const isPremiumUser = !!skills?.length && skills.every((s) => s.userHasAccess);

  useEffect(() => {
    if (complete.isSuccess) {
      router.replace('/(tabs)/lessons');
    }
  }, [complete.isSuccess]);

  function handleToggleTrack(id: string) {
    if (isPremiumUser) {
      setSelectedTrackIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      return;
    }
    // Free user: single selection
    if (selectedTrackIds.includes(id)) {
      // Deselecting the current track
      setSelectedTrackIds([]);
      setPremiumTrackSkipped(false);
    } else {
      // Selecting a new track (replaces any existing selection)
      setSelectedTrackIds([id]);
      const skill = skills?.find((s) => s.id === id);
      if (skill?.userHasAccess !== false) {
        // Switched to a free track — clear skip banner
        setPremiumTrackSkipped(false);
      }
      // If locked, onLockPress() in the press handler opens the upgrade modal
    }
  }

  function handleMaybeLater() {
    setShowUpgradeModal(false);
    setPremiumTrackSkipped(true);
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      await api.post('/auth/dummy-upgrade');
      await queryClient.invalidateQueries({ queryKey: ['skills'] });
      setShowUpgradeModal(false);
    } finally {
      setUpgrading(false);
    }
  }

  function handleNext() {
    if (step === 1) {
      if (!seniority) return;
      setStep(2);
    } else if (step === 2) {
      if (selectedTrackIds.length === 0) return;
      setStep(3);
    }
  }

  function handleBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  function handleSubmit() {
    if (!seniority || selectedTrackIds.length === 0) return;
    complete.mutate({ seniority, trackIds: selectedTrackIds, timezone, preferredTime });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            {step > 1 ? (
              <Pressable testID="back-button" onPress={handleBack} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
              </Pressable>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}
            <StepIndicator step={step} />
          </View>

          <Text style={styles.greeting}>Welcome, {user?.name ?? 'there'}!</Text>
          <Text style={styles.greetingSub}>Let's set up your learning preferences</Text>

          <Card style={styles.card}>
            {complete.isError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  {(complete.error as Error | null)?.message ??
                    'Something went wrong. Please try again.'}
                </Text>
              </View>
            )}

            {step === 1 && (
              <SeniorityStep selected={seniority} onSelect={setSeniority} />
            )}
            {step === 2 && (
              <TracksStep
                skills={skills}
                isLoading={skillsLoading}
                isError={skillsError}
                selectedIds={selectedTrackIds}
                onToggle={handleToggleTrack}
                onLockPress={() => setShowUpgradeModal(true)}
                isPremiumUser={isPremiumUser}
                premiumTrackSkipped={premiumTrackSkipped}
              />
            )}
            {step === 3 && (
              <TimezoneStep
                timezone={timezone}
                onTimezoneChange={setTimezone}
                preferredTime={preferredTime}
                onPreferredTimeChange={setPreferredTime}
              />
            )}

            {step < 3 ? (
              <Button
                testID="onboarding-next"
                label="Continue"
                onPress={handleNext}
                style={styles.actionBtn}
              />
            ) : (
              <Button
                testID="onboarding-submit"
                label={complete.isPending ? 'Saving…' : 'Get started'}
                onPress={handleSubmit}
                disabled={complete.isPending}
                style={styles.actionBtn}
              />
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={showUpgradeModal}
        animationType="fade"
        onRequestClose={handleMaybeLater}
      >
        <Pressable style={styles.modalOverlay} onPress={handleMaybeLater}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Unlock all tracks with Premium</Text>
            <Text style={styles.modalBody}>
              Get unlimited access to all tracks and every lesson, instantly.
            </Text>
            <Text style={styles.modalBody}>
              Or continue with a limited preview of premium tracks.
            </Text>
            <Button
              label={upgrading ? 'Upgrading…' : 'Upgrade now'}
              onPress={handleUpgrade}
              disabled={upgrading}
              style={styles.modalBtn}
            />
            <Pressable onPress={handleMaybeLater} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Maybe later</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.vivid },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: { paddingVertical: spacing.xs },
  backBtnText: { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.white },
  backBtnPlaceholder: { width: 48 },
  stepIndicator: { flexDirection: 'row', gap: spacing.xs },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  stepDotActive: { backgroundColor: colors.white },
  greeting: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.white,
    textAlign: 'center',
  },
  greetingSub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  card: { gap: spacing.md },
  stepHeading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
  },
  stepSub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionCardSelected: {
    borderColor: colors.teal,
    backgroundColor: '#EEF2FF',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: colors.teal },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.btn,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { borderColor: colors.teal, backgroundColor: colors.teal },
  checkmark: { fontSize: 12, color: colors.white, fontFamily: font.bold },
  optionTextWrap: { flex: 1, gap: 2 },
  optionLabel: {
    fontFamily: font.medium,
    fontSize: fontSize.base,
    color: colors.textDark,
  },
  optionLabelSelected: { color: colors.teal },
  optionSub: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  lockBadge: {
    fontFamily: font.medium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  fieldLabel: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textDark,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.textDark,
    backgroundColor: colors.white,
  },
  centered: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  loadingText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  errorText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error, textAlign: 'center' },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.btn,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  actionBtn: { marginTop: spacing.xs },
  // Premium track info banner
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.btn,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  infoBannerText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.vivid,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Upgrade modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.textDark,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBtn: { marginTop: spacing.xs },
  modalCancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  modalCancelText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
