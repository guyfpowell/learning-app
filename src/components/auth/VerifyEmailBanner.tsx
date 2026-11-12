import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { colors, font } from '@/theme';

/**
 * Under the status bar while the email is unverified (board 22, 3a and 3b): a neutral sand pill, so it is
 * not mistaken for an error or XP. "Resend" asks again; once sent it says so, with nothing left to press.
 */
export function VerifyEmailBanner({ sent, sending, onResend }: { sent: boolean; sending: boolean; onResend: () => void }) {
  return (
    <View testID="email-verification-banner" style={styles.pill}>
      <View style={styles.tile}>
        <Icon name="email" size={16} color={colors.textStrong} />
      </View>
      <Text style={styles.message}>
        {sent ? 'Verification email sent. Check your inbox.' : 'Please verify your email to keep your account active.'}
      </Text>
      {!sent && (
        <Pressable testID="resend-verification" onPress={() => { if (!sending) onResend(); }} accessibilityRole="button" accessibilityLabel="Resend verification email" hitSlop={8}>
          <Text style={styles.resend}>{sending ? 'Sending…' : 'Resend'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    marginHorizontal:  16,
    marginBottom:      4,
    borderRadius:      14,
    backgroundColor:   colors.surfaceSunken,
    paddingVertical:   10,
    paddingHorizontal: 12,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
  },
  tile:    { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, fontFamily: font.semibold, fontSize: 13, lineHeight: 13 * 1.35, color: colors.textBody },
  resend:  { fontFamily: font.extrabold, fontSize: 13, color: colors.brand },
});
