import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { features } from '@/config/features';
import { useCreateTopUp, useInvalidateWallet } from '@/hooks/useWallet';
import { walletService } from '@/services/wallet.service';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

// useStripe is loaded via require() so the native module is never touched
// unless stripePayments is true (i.e. running in an EAS Build, not Expo Go).
const useStripe: (() => ReturnType<typeof import('@stripe/stripe-react-native').useStripe>) | null =
  features.stripePayments
    ? (require('@stripe/stripe-react-native').useStripe as typeof import('@stripe/stripe-react-native').useStripe)
    : null;

interface TopUpSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
}

type Step = 'amount' | 'processing' | 'success' | 'error';

// ─── Shared backdrop ────────────────────────────────────────────────────────

function useSharedBackdrop() {
  return useCallback(
    (props: Parameters<typeof BottomSheetBackdrop>[0]) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );
}

// ─── Public export ──────────────────────────────────────────────────────────

/**
 * Routes to the Stripe-powered top-up or an informational placeholder
 * based on the stripePayments feature flag.
 */
export function TopUpSheet({ sheetRef }: TopUpSheetProps) {
  if (features.stripePayments) return <StripeTopUpContent sheetRef={sheetRef} />;
  if (features.stripeCheckout) return <CheckoutTopUpContent sheetRef={sheetRef} />;
  return <TopUpUnavailable sheetRef={sheetRef} />;
}

// ─── Stripe-powered top-up ──────────────────────────────────────────────────

/**
 * Full top-up implementation using Stripe's native payment sheet.
 * Only rendered when features.stripePayments is true and StripeProvider
 * is present in the tree.
 */
function StripeTopUpContent({ sheetRef }: TopUpSheetProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe!();
  const createTopUp = useCreateTopUp();
  const invalidateWallet = useInvalidateWallet();

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('amount');
  const [errorMsg, setErrorMsg] = useState('');

  const renderBackdrop = useSharedBackdrop();

  function reset() {
    setAmount('');
    setAmountError(null);
    setStep('amount');
    setErrorMsg('');
    createTopUp.reset();
  }

  function close() {
    sheetRef.current?.close();
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
      const { clientSecret } = await createTopUp.mutateAsync(pence);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'PocketChange',
        style: 'alwaysLight',
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          setStep('amount');
          return;
        }
        throw new Error(presentError.message);
      }

      await invalidateWallet();
      setStep('success');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Payment failed. Please try again.'
      );
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
              onChangeText={(t) => { setAmount(t); setAmountError(null); }}
              error={amountError ?? undefined}
              placeholder="e.g. 10.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
              autoFocus
            />
            <View style={styles.btnRow}>
              <Button label="Continue" onPress={handleContinue} loading={false} />
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

// ─── Hosted checkout (Expo Go compatible) ────────────────────────────────────

/**
 * Opens Stripe's hosted checkout page in a browser.
 * Works in Expo Go — no native Stripe module required.
 * The backend creates a Checkout Session; Stripe redirects to
 * pocketchange://topup-success or pocketchange://topup-cancel when done.
 */
function CheckoutTopUpContent({ sheetRef }: TopUpSheetProps) {
  const invalidateWallet = useInvalidateWallet();
  const renderBackdrop = useSharedBackdrop();

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('amount');
  const [errorMsg, setErrorMsg] = useState('');

  function reset() {
    setAmount('');
    setAmountError(null);
    setStep('amount');
    setErrorMsg('');
  }

  function close() {
    sheetRef.current?.close();
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
      const { url } = await walletService.createCheckout(pence);
      const result = await WebBrowser.openAuthSessionAsync(url, 'pocketchange://');

      if (result.type === 'success' && result.url?.includes('topup-success')) {
        await invalidateWallet();
        setStep('success');
      } else if (result.type === 'cancel' || result.url?.includes('topup-cancel')) {
        setStep('amount');
      } else {
        // Browser closed without a clear result — wallet may still be credited via webhook
        await invalidateWallet();
        setStep('amount');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
              onChangeText={(t) => { setAmount(t); setAmountError(null); }}
              error={amountError ?? undefined}
              placeholder="e.g. 10.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
              autoFocus
            />
            <View style={styles.btnRow}>
              <Button label="Continue" onPress={handleContinue} loading={false} />
              <Button label="Cancel" variant="outline" onPress={close} />
            </View>
          </>
        )}

        {step === 'processing' && (
          <View style={styles.centred}>
            <Button label="Opening payment…" loading disabled />
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

// ─── Expo Go placeholder ─────────────────────────────────────────────────────

/**
 * Shown in Expo Go where the Stripe native module is unavailable.
 * Renders the same bottom sheet shell so the parent's sheetRef still works.
 */
function TopUpUnavailable({ sheetRef }: TopUpSheetProps) {
  const renderBackdrop = useSharedBackdrop();

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['42%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.heading}>TOP UP WALLET</Text>
        <Text style={styles.unavailableTitle}>Not available in Expo Go</Text>
        <Text style={styles.sub}>
          Wallet top-up uses Stripe's native payment sheet, which requires a
          custom dev build.{'\n\n'}
          Set{' '}
          <Text style={styles.code}>EXPO_PUBLIC_STRIPE_ENABLED=true</Text>
          {' '}in .env.local and run{' '}
          <Text style={styles.code}>npm run ios</Text>
          {' '}or{' '}
          <Text style={styles.code}>npm run android</Text>.
        </Text>
        <Button
          label="Close"
          variant="outline"
          onPress={() => sheetRef.current?.close()}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  handle: { backgroundColor: colors.border },
  background: { backgroundColor: colors.white },
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
    lineHeight: 20,
  },
  unavailableTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  code: {
    fontFamily: 'Courier',
    fontSize: fontSize.xs,
    color: colors.teal,
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
  iconText: { fontSize: 28, color: colors.success },
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
  doneBtn: { minWidth: 120 },
});
