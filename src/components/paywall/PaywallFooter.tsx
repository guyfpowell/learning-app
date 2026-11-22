import { Pressable, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui/Text';
import { colors, font, fontSize, spacing } from '@/theme';
import { useRestorePurchases } from '@/hooks/useIAP';
import { writeError } from '@/lib/errors';
import { paywallStyles } from '@/components/paywall/paywallStyles';

// TODO: replace with final hosted URLs before App Review submission
const TERMS_URL   = 'https://ascentlearning.app/terms';
const PRIVACY_URL = 'https://ascentlearning.app/privacy';

// Payment errors show fixed copy, never the server's words; a signal drop says it was the signal (ADR-021).
const RESTORE_FAILED_COPY = "Couldn't restore purchases. Please try again.";

/** What App Review requires under the Subscribe button: the auto-renew disclosure, the legal links and Restore Purchases. */
export function PaywallFooter() {
  const restore = useRestorePurchases();
  return (
    <>
      <Text testID="auto-renew-disclosure" style={styles.disclosure}>
        Subscription automatically renews unless cancelled at least 24 hours
        before the end of the current period. Manage or cancel in iOS Settings.
      </Text>

      <View style={styles.legalLinks}>
        <Text testID="terms-link" style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
          Terms of Use
        </Text>
        <Text style={styles.legalSep}>·</Text>
        <Text testID="privacy-link" style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
          Privacy Policy
        </Text>
      </View>

      <Pressable
        testID="restore-purchases-btn"
        onPress={() => restore.mutate()}
        disabled={restore.isPending}
        accessibilityState={{ disabled: restore.isPending }}
        style={styles.restoreBtn}
      >
        <Text style={styles.restoreText}>
          {restore.isPending ? 'Restoring…' : 'Restore Purchases'}
        </Text>
      </Pressable>

      {restore.isError && (
        <Text testID="restore-error" style={paywallStyles.errorText}>
          {writeError(restore.error, RESTORE_FAILED_COPY)}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  disclosure: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textSubtle,
    textAlign:  'center',
    lineHeight: fontSize.xs * 1.6,
  },
  legalLinks: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            spacing.xs,
  },
  legalLink: {
    fontFamily:         font.regular,
    fontSize:           fontSize.xs,
    color:              colors.textLink,
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textSubtle,
  },
  restoreBtn: {
    alignItems:      'center',
    paddingVertical: spacing.xs,
  },
  restoreText: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textLink,
  },
});
