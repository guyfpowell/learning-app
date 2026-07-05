import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSkills, useCompleteOnboarding } from '@/hooks/useOnboarding';
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
  morning: 'Morning (7:00 AM)',
  afternoon: 'Afternoon (12:00 PM)',
  evening: 'Evening (6:00 PM)',
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
      <Text style={styles.stepHeading}>What's your seniority level?</Text>
      <Text style={styles.stepSub}>
        We'll tailor content to your experience.
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
  isPremiumUser,
}: {
  skills: SkillWithAccess[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  isPremiumUser: boolean;
}) {
  if (isLoading) {
    return (
      <View style={styles.centered} testID="tracks-loading">
        <ActivityIndicator size="large" color={colors.teal} />
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
      <Text style={styles.stepHeading}>
        {isPremiumUser ? 'Choose your tracks' : 'Choose a track to start'}
      </Text>
      <Text style={styles.stepSub}>
        {isPremiumUser
          ? 'Select the skills you want to develop.'
          : 'Select one track to begin your learning journey.'}
      </Text>
      {skills.map((skill) => {
        const isSelected = selectedIds.includes(skill.id);
        const isLocked = !skill.userHasAccess;
        return (
          <Pressable
            key={skill.id}
            testID={`skill-${skill.id}`}
            onPress={() => !isLocked && onToggle(skill.id)}
            style={[
              styles.optionCard,
              isSelected && styles.optionCardSelected,
              isLocked && styles.optionCardLocked,
            ]}
          >
            {isPremiumUser ? (
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            ) : (
              <View style={[styles.radioOuter, !isLocked && isSelected && styles.radioOuterSelected]}>
                {!isLocked && isSelected && <View style={styles.radioInner} />}
              </View>
            )}
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionLabel, isLocked && styles.optionLabelLocked]}>
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
      <Text style={styles.stepHeading}>When do you learn best?</Text>
      <Text style={styles.stepSub}>
        We'll schedule reminders around your preferred time.
      </Text>

      <Text style={styles.fieldLabel}>Timezone</Text>
      <TextInput
        testID="timezone-input"
        style={styles.textInput}
        value={timezone}
        onChangeText={onTimezoneChange}
        placeholder="UTC"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
        Preferred time
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
  const { data: skills, isLoading: skillsLoading, isError: skillsError } = useSkills();
  const complete = useCompleteOnboarding();

  const [step, setStep] = useState<Step>(1);
  const [seniority, setSeniority] = useState<Seniority | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [preferredTime, setPreferredTime] = useState<PreferredTime>('morning');

  const isPremiumUser = !!skills?.length && skills.every((s) => s.userHasAccess);

  useEffect(() => {
    if (complete.isSuccess) {
      router.replace('/(tabs)');
    }
  }, [complete.isSuccess]);

  function handleToggleTrack(id: string) {
    setSelectedTrackIds((prev) => {
      if (isPremiumUser) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      // Free user: single selection
      return prev.includes(id) ? [] : [id];
    });
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

          <Card style={styles.card}>
            {complete.isError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  Something went wrong. Please try again.
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
                isPremiumUser={isPremiumUser}
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
                label="Get started"
                onPress={handleSubmit}
                loading={complete.isPending}
                style={styles.actionBtn}
              />
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
  optionCardLocked: { opacity: 0.5 },
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
  optionLabelLocked: { color: colors.textMuted },
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
});
