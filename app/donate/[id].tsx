import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { donationService } from '@/services/donation.service';
import { useInvalidateWallet } from '@/hooks/useWallet';
import { colors, font, fontSize, radius, spacing, tracking } from '@/theme';

type Step = 'amount' | 'confirm' | 'processing' | 'success' | 'error';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function DonateScreen() {
  const { id, token, displayName } = useLocalSearchParams<{
    id: string;
    token?: string;
    displayName?: string;
  }>();
  const router = useRouter();
  const invalidateWallet = useInvalidateWallet();

  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [donationId, setDonationId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUUID());
  const submittingRef = useRef(false);

  const pence = Math.round(parseFloat(amount) * 100);
  const amountValid = !isNaN(pence) && pence >= 1;
  const name = displayName ?? 'recipient';

  async function handleConfirm() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStep('processing');
    try {
      const result = token
        ? await donationService.donateByToken(token, pence, idempotencyKey)
        : await donationService.donateById(id, pence, idempotencyKey);
      setDonationId(result.donationId);
      await invalidateWallet();
      setStep('success');
    } catch (err) {
      const typed = err as { response?: { data?: { error?: string } } };
      setErrorMsg(
        typed?.response?.data?.error ?? 'Donation failed. Please try again.'
      );
      setIdempotencyKey(generateUUID());
      submittingRef.current = false;
      setStep('error');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.teal} />
        </Pressable>
        <Text style={styles.navTitle}>DONATE</Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Amount ── */}
          {step === 'amount' && (
            <>
              <Text style={styles.stepTitle}>Donate to {name}</Text>
              <Card style={styles.inputCard}>
                <Text style={styles.inputLabel}>AMOUNT</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.pound}>£</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                  />
                </View>
                <Text style={styles.minNote}>Minimum £0.01</Text>
              </Card>
              <Button
                label="Next"
                onPress={() => setStep('confirm')}
                disabled={!amountValid}
              />
            </>
          )}

          {/* ── Confirm ── */}
          {step === 'confirm' && (
            <>
              <Text style={styles.stepTitle}>Confirm donation</Text>
              <Card style={styles.confirmCard}>
                <Text style={styles.confirmAmount}>
                  £{(pence / 100).toFixed(2)}
                </Text>
                <Text style={styles.confirmTo}>to {name}</Text>
              </Card>
              <Button label="Confirm & donate" onPress={handleConfirm} />
              <Pressable onPress={() => setStep('amount')} style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>Change amount</Text>
              </Pressable>
            </>
          )}

          {/* ── Processing ── */}
          {step === 'processing' && (
            <View style={styles.centred}>
              <Spinner size="large" color={colors.teal} />
              <Text style={styles.processingText}>Sending donation…</Text>
            </View>
          )}

          {/* ── Success ── */}
          {step === 'success' && (
            <View style={styles.centred}>
              <View style={styles.successCircle}>
                <Text style={styles.successCheck}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Donation sent!</Text>
              <Text style={styles.successSub}>
                Thank you for making a difference.
              </Text>
              {donationId && (
                <Button
                  label="View donation"
                  onPress={() =>
                    router.replace({
                      pathname: '/donation/[id]',
                      params: { id: donationId },
                    })
                  }
                  style={styles.actionBtn}
                />
              )}
              <Pressable onPress={() => router.back()} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}

          {/* ── Error ── */}
          {step === 'error' && (
            <View style={styles.centred}>
              <Text style={styles.errorTitle}>Donation failed</Text>
              <Text style={styles.errorMsg}>{errorMsg}</Text>
              <View style={styles.errorBtns}>
                <Button
                  label="Try again"
                  onPress={() => setStep('confirm')}
                  style={styles.halfBtn}
                />
                <Button
                  label="Cancel"
                  onPress={() => router.back()}
                  style={styles.halfBtn}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.teal,
    letterSpacing: tracking.heading,
  },
  navSpacer: {
    width: 38,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    flexGrow: 1,
  },
  stepTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
    marginTop: spacing.sm,
  },
  // Amount input
  inputCard: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.heading,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.input,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  pound: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.teal,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.teal,
    paddingVertical: spacing.md,
  },
  minNote: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  // Confirm
  confirmCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  confirmAmount: {
    fontFamily: font.bold,
    fontSize: 40,
    color: colors.teal,
    letterSpacing: -0.5,
  },
  confirmTo: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  changeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  changeBtnText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.vivid,
  },
  // Shared centred (processing / success / error)
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
  processingText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.teal,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: {
    fontSize: 32,
    color: colors.success,
    fontFamily: font.bold,
  },
  successTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
  },
  successSub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actionBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
  doneBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.md,
    color: colors.error,
  },
  errorMsg: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  errorBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  halfBtn: {
    flex: 1,
  },
});
