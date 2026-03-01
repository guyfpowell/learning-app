import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { donationService } from '@/services/donation.service';
import { useInvalidateWallet } from '@/hooks/useWallet';
import { colors, font, fontSize, radius, spacing } from '@/theme';

type SheetState = 'amount' | 'confirm' | 'processing' | 'success' | 'error';

interface DonationSheetProps {
  sheetRef: React.RefObject<BottomSheet>;
  recipientId: string;
  /** Raw QR token, present when the donor arrived via camera scan. */
  token?: string;
  displayName: string;
}

export function DonationSheet({
  sheetRef,
  recipientId,
  token,
  displayName,
}: DonationSheetProps) {
  const router = useRouter();
  const [sheetState, setSheetState] = useState<SheetState>('amount');
  const [amount, setAmount] = useState('');
  const [donationId, setDonationId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const invalidateWallet = useInvalidateWallet();

  const pence = Math.round(parseFloat(amount) * 100);
  const amountValid = !isNaN(pence) && pence >= 1; // min £0.01

  function reset() {
    setSheetState('amount');
    setAmount('');
    setDonationId(null);
    setErrorMsg('');
  }

  function close() {
    sheetRef.current?.close();
    setTimeout(reset, 300);
  }

  function handleProceed() {
    if (!amountValid) return;
    setSheetState('confirm');
  }

  async function handleConfirm() {
    setSheetState('processing');
    try {
      const result = token
        ? await donationService.donateByToken(token, pence)
        : await donationService.donateById(recipientId, pence);

      setDonationId(result.donationId);
      await invalidateWallet();
      setSheetState('success');
    } catch (err) {
      const typed = err as { response?: { data?: { error?: string } } };
      setErrorMsg(
        typed?.response?.data?.error ?? 'Donation failed. Please try again.'
      );
      setSheetState('error');
    }
  }

  function handleViewDonation() {
    close();
    if (donationId) {
      setTimeout(() => router.push({ pathname: '/donation/[id]', params: { id: donationId } }), 350);
    }
  }

  const renderBackdrop = useCallback(
    (props: object) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['55%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
    >
      <View style={styles.container}>
        {/* ── Step 1: Amount ── */}
        {sheetState === 'amount' && (
          <>
            <Text style={styles.title}>Donate to {displayName}</Text>

            <View style={styles.inputRow}>
              <Text style={styles.pound}>£</Text>
              <BottomSheetTextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={handleProceed}
              />
            </View>
            <Text style={styles.minNote}>Minimum donation £0.01</Text>

            <Button
              label="Next"
              onPress={handleProceed}
              disabled={!amountValid}
              style={styles.btn}
            />
          </>
        )}

        {/* ── Step 2: Confirm ── */}
        {sheetState === 'confirm' && (
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmLabel}>CONFIRM DONATION</Text>

            <View style={styles.confirmCard}>
              <Text style={styles.confirmAmount}>
                £{(pence / 100).toFixed(2)}
              </Text>
              <Text style={styles.confirmTo}>to {displayName}</Text>
            </View>

            <Button
              label="Confirm"
              onPress={handleConfirm}
              style={styles.btn}
            />
            <Pressable
              onPress={() => setSheetState('amount')}
              style={styles.changeAmountBtn}
            >
              <Text style={styles.changeAmountText}>Change amount</Text>
            </Pressable>
          </View>
        )}

        {/* ── Processing ── */}
        {sheetState === 'processing' && (
          <View style={styles.centred}>
            <Spinner size="large" color={colors.teal} />
            <Text style={styles.processingText}>Sending donation…</Text>
          </View>
        )}

        {/* ── Success ── */}
        {sheetState === 'success' && (
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
                label="View Donation"
                onPress={handleViewDonation}
                style={styles.btn}
              />
            )}
            <Pressable onPress={close} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* ── Error ── */}
        {sheetState === 'error' && (
          <View style={styles.centred}>
            <Text style={styles.errorTitle}>Donation failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <View style={styles.errorBtns}>
              <Button
                label="Try Again"
                onPress={() => setSheetState('confirm')}
                style={styles.halfBtn}
              />
              <Button
                label="Cancel"
                onPress={close}
                style={styles.halfBtn}
              />
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.white,
  },
  handle: {
    backgroundColor: colors.border,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  // Amount step
  title: {
    fontFamily: font.bold,
    fontSize: fontSize.md,
    color: colors.teal,
    marginBottom: spacing.lg,
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
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  btn: {
    marginTop: spacing.sm,
  },
  // Confirm step
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  confirmLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  confirmCard: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
    gap: spacing.xs,
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
  changeAmountBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  changeAmountText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.vivid,
  },
  // Shared centred layout (processing / success / error)
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  processingText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.teal,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: {
    fontSize: 28,
    color: colors.success,
    fontFamily: font.bold,
  },
  successTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.md,
    color: colors.teal,
  },
  successSub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
