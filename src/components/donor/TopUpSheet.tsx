import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useStripe } from '@stripe/stripe-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateTopUp, useInvalidateWallet } from '@/hooks/useWallet';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

interface TopUpSheetProps {
  /** Call with a ref so the parent can open/close */
  sheetRef: React.RefObject<BottomSheet>;
}

type Step = 'amount' | 'processing' | 'success' | 'error';

export function TopUpSheet({ sheetRef }: TopUpSheetProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const createTopUp = useCreateTopUp();
  const invalidateWallet = useInvalidateWallet();

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('amount');
  const [errorMsg, setErrorMsg] = useState('');

  const renderBackdrop = useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  function reset() {
    setAmount('');
    setAmountError(null);
    setStep('amount');
    setErrorMsg('');
    createTopUp.reset();
  }

  function close() {
    sheetRef.current?.close();
    // Small delay before resetting so the sheet animation completes
    setTimeout(reset, 300);
  }

  async function handleContinue() {
    const pence = Math.round(parseFloat(amount) * 100);
    if (!amount || isNaN(pence) || pence < 100) {
      setAmountError('Enter an amount of £1.00 or more');
      return;
    }
    setAmountError(null);
    setStep('processing');

    try {
      // 1. Create the PaymentIntent on the server
      const { clientSecret } = await createTopUp.mutateAsync(pence);

      // 2. Initialise the Stripe PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'PocketChange',
        style: 'alwaysLight',
      });

      if (initError) throw new Error(initError.message);

      // 3. Present the native Stripe payment UI
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // User dismissed — go back to amount step
          setStep('amount');
          return;
        }
        throw new Error(presentError.message);
      }

      // 4. Success — refresh wallet balance
      await invalidateWallet();
      setStep('success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setErrorMsg(msg);
      setStep('error');
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['50%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={reset}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
    >
      <BottomSheetView style={styles.content}>
        {step === 'amount' && (
          <>
            <Text style={styles.heading}>TOP UP WALLET</Text>
            <Text style={styles.sub}>Add funds to donate to recipients.</Text>

            <Input
              label="Amount (£)"
              value={amount}
              onChangeText={(t) => {
                setAmount(t);
                setAmountError(null);
              }}
              error={amountError ?? undefined}
              placeholder="e.g. 10.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
              autoFocus
            />

            <View style={styles.btnRow}>
              <Button
                label="Continue"
                onPress={handleContinue}
                loading={false}
              />
              <Button label="Cancel" variant="outline" onPress={close} />
            </View>
          </>
        )}

        {step === 'processing' && (
          <View style={styles.centred}>
            <Button label="Processing…" loading disabled />
          </View>
        )}

        {step === 'success' && (
          <View style={styles.centred}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>✓</Text>
            </View>
            <Text style={styles.successHeading}>Top up complete!</Text>
            <Text style={styles.sub}>Your wallet has been updated.</Text>
            <Button label="Done" onPress={close} style={styles.doneBtn} />
          </View>
        )}

        {step === 'error' && (
          <View style={styles.centred}>
            <Text style={styles.errorHeading}>Payment failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <View style={styles.btnRow}>
              <Button label="Try Again" onPress={() => setStep('amount')} />
              <Button label="Cancel" variant="outline" onPress={close} />
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handle: {
    backgroundColor: colors.border,
  },
  background: {
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.md,
    color: colors.teal,
    letterSpacing: tracking.heading,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  centred: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 28,
    color: colors.success,
  },
  successHeading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
  },
  errorHeading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.error,
  },
  errorMsg: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  doneBtn: {
    minWidth: 120,
  },
});
