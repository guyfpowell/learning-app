import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRegister } from '@/hooks/useAuth';
import { colors, font, fontSize, spacing } from '@/theme';
import { extractError } from '@/lib/errors';

const SYMBOL_RE = /[!@#$%^&*()[\]{}|;:,.<>?\-_=+/]/;

const PASSWORD_CRITERIA = [
  { label: 'At least 10 characters', test: (pw: string) => pw.length >= 10 },
  { label: 'At least 1 uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'At least 1 lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { label: 'At least 1 number', test: (pw: string) => /[0-9]/.test(pw) },
  { label: 'At least 1 symbol (! @ # $ % ^ & * …)', test: (pw: string) => SYMBOL_RE.test(pw) },
];

function PasswordHint({ password }: { password: string }) {
  return (
    <View style={hintStyles.container}>
      {PASSWORD_CRITERIA.map(({ label, test }) => {
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  const unmet = PASSWORD_CRITERIA.filter(c => !c.test(password)).map(c => c.label);
  if (unmet.length > 0) return `Password must include: ${unmet.join(', ')}`;
  return null;
}

function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();

  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirm, setConfirm]               = useState('');
  const [touched, setTouched]               = useState({ name: false, email: false, password: false, confirm: false });
  const [passwordFocused, setPasswordFocused] = useState(false);

  const nameError     = touched.name     ? validateName(name)                       : null;
  const emailError    = touched.email    ? validateEmail(email)                     : null;
  const passwordError = touched.password ? validatePassword(password)               : null;
  const confirmError  = touched.confirm  ? validateConfirm(password, confirm)       : null;

  function handleSubmit() {
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (
      validateName(name) ||
      validateEmail(email) ||
      validatePassword(password) ||
      validateConfirm(password, confirm)
    ) return;
    register.mutate({ name: name.trim(), email: email.trim().toLowerCase(), password });
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
          <Logo size={64} />
          <Wordmark width={150} height={35} />
          <Text style={styles.tagline}>A little every day</Text>

          <Card style={styles.card}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.sub}>
              Join Ascent and start building your skills.
            </Text>

            {register.isError && (
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

              <View>
                <Input
                  testID="register-password"
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  error={passwordError ?? undefined}
                  placeholder="Min 10 characters"
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="next"
                />
                {passwordFocused && <PasswordHint password={password} />}
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

            <Button
              testID="register-submit"
              label="Create account"
              onPress={handleSubmit}
              loading={register.isPending}
              style={styles.submitBtn}
            />
          </Card>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>
              {'Already have an account? '}
              <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.brand,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  tagline: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.white,
    opacity: 0.85,
    marginBottom: spacing.sm,
  },
  card: {
    width: '100%',
    gap: spacing.md,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.brand,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  successBanner: {
    backgroundColor: colors.successBg,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  successBannerText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  fields: {
    gap: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  link: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.white,
    textAlign: 'center',
  },
  linkBold: {
    fontFamily: font.bold,
  },
});

const hintStyles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
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
    flex: 1,
  },
  labelMet: {
    color: colors.success,
  },
});
