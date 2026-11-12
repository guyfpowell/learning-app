import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { Input } from '@/components/ui/Input';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { useRegister } from '@/hooks/useAuth';
import { authService } from '@/services/auth.service';
import { colors, font, fontSize, press, radius, spacing } from '@/theme';
import { extractError, errorCode } from '@/lib/errors';
import * as Sentry from '@sentry/react-native';
import {
  ERROR_CODES,
  INVITE_CODE_DISPLAY_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  formatInviteCode,
  isValidEmail,
  normaliseEmail,
  normaliseInviteCode,
  unmetPasswordRules,
} from '@learning/shared';

function PasswordHint({ password }: { password: string }) {
  return (
    <View style={hintStyles.container}>
      {PASSWORD_RULES.map(({ label, test }) => {
        const met = test(password);
        return (
          <View key={label} style={hintStyles.row}>
            <Text style={[hintStyles.icon, met && hintStyles.iconMet]}>{met ? '✓' : '○'}</Text>
            <Text style={[hintStyles.label, met && hintStyles.labelMet]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  return null;
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!isValidEmail(email)) return 'Enter a valid email address';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  const unmet = unmetPasswordRules(password);
  if (unmet.length > 0) return `Password must include: ${unmet.join(', ')}`;
  return null;
}

function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

/** Copy for the four INVITE_CODE_* server errors (ticket 073a). */
const INVITE_ERROR_COPY = new Map<string, string>([
  [ERROR_CODES.INVITE_CODE_REQUIRED, 'An invite code is required.'],
  [ERROR_CODES.INVITE_CODE_INVALID, 'This invite code is not valid.'],
  [ERROR_CODES.INVITE_CODE_EXHAUSTED, 'This invite code has already been used.'],
  [ERROR_CODES.INVITE_CODE_EXPIRED, 'This invite code has expired.'],
]);

export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();

  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirm, setConfirm]               = useState('');
  const [inviteCode, setInviteCode]         = useState('');
  const [touched, setTouched]               = useState({ name: false, email: false, password: false, confirm: false });
  const [passwordFocused, setPasswordFocused] = useState(false);
  // Ticket 073a: invite field hidden until mode says invite_only or server demands it.
  const [showInviteField, setShowInviteField] = useState(false);

  const nameError     = touched.name     ? validateName(name)                       : null;
  const emailError    = touched.email    ? validateEmail(email)                     : null;
  const passwordError = touched.password ? validatePassword(password)               : null;
  const confirmError  = touched.confirm  ? validateConfirm(password, confirm)       : null;

  // On mount, fetch registration mode. If invite_only → show field immediately.
  // If the call fails for any reason → leave hidden (step 2 is the correctness guarantee).
  useEffect(() => {
    authService.getRegistrationMode()
      .then(({ mode }) => {
        if (mode === 'invite_only') setShowInviteField(true);
      })
      .catch((err) => {
        // Field stays hidden; an INVITE_CODE_REQUIRED server error will reveal it if needed.
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'registration-mode fetch failed',
          level: 'warning',
          data: { error: String(err) },
        });
      });
  }, []);

  function handleInviteCodeChange(text: string) {
    setInviteCode(formatInviteCode(text));
  }

  function handleSubmit() {
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (
      validateName(name) ||
      validateEmail(email) ||
      validatePassword(password) ||
      validateConfirm(password, confirm)
    ) return;
    const canonical = normaliseInviteCode(inviteCode);
    register.mutate({
      name: name.trim(),
      email: normaliseEmail(email),
      password,
      ...(canonical ? { inviteCode: canonical } : {}),
    });
  }

  // Ticket 073a step 2: reveal invite field on INVITE_CODE_REQUIRED server error.
  const serverErrorCode = register.error ? errorCode(register.error) : null;

  if (serverErrorCode === ERROR_CODES.INVITE_CODE_REQUIRED && !showInviteField) {
    setShowInviteField(true);
  }

  const inviteError = serverErrorCode ? INVITE_ERROR_COPY.get(serverErrorCode) : undefined;

  return (
    <AuthFrame
      title="Create account"
      intro="Join Ascent and start building your skills."
      footerLead="Already have an account?"
      footerAction="Sign in"
      onFooter={() => router.back()}
      scrollToEnd={passwordFocused}
    >
      {register.isError && !inviteError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {extractError(register.error)}
          </Text>
        </View>
      )}

      {register.isSuccess && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>
            Account created! Redirecting…
          </Text>
        </View>
      )}

      <View style={styles.fields}>
        {/* Ticket 073a: invite code above email when visible */}
        {showInviteField && (
          <Input
            testID="register-invite-code"
            label="Invite code"
            value={inviteCode}
            onChangeText={handleInviteCodeChange}
            error={inviteError}
            placeholder="XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={INVITE_CODE_DISPLAY_LENGTH}
            returnKeyType="next"
          />
        )}

        <Input
          testID="register-name"
          label="Name"
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={nameError ?? undefined}
          placeholder="Your full name"
          autoComplete="name"
          returnKeyType="next"
        />

        <Input
          testID="register-email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError ?? undefined}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
        />

        <View style={styles.passwordBlock}>
          {passwordFocused && <PasswordHint password={password} />}
          <Input
            testID="register-password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError ?? undefined}
            placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
          />
        </View>

        <Input
          testID="register-confirm"
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          error={confirmError ?? undefined}
          placeholder="Repeat your password"
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </View>

      <EdgeButton
        testID="register-submit"
        look={{ face: colors.brand, label: colors.onBrand, edge: press.primaryEdge }}
        label="Create account"
        onPress={handleSubmit}
        loading={register.isPending}
      />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  successBanner: {
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  successBannerText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  fields: {
    gap: 16,
  },
  // The requirements sit above the box, so they never push Confirm password and the button off the screen.
  passwordBlock: {
    gap: 10,
  },
});

const hintStyles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    width: 16,
  },
  iconMet: {
    color: colors.success,
  },
  label: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  labelMet: {
    color: colors.success,
  },
});
