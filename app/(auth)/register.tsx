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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRegister } from '@/hooks/useAuth';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

function extractError(err: unknown): string {
  const typed = err as { response?: { data?: { error?: string } } };
  return typed?.response?.data?.error ?? 'Registration failed. Please try again.';
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
  if (password.length < 8) return 'Password must be at least 8 characters';
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

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [touched, setTouched]     = useState({ name: false, email: false, password: false, confirm: false });

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
          <Logo size={72} />
          <Text style={styles.appName}>LEARNING</Text>

          <Card style={styles.card}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.sub}>
              Join Learning and start building your skills.
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

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={passwordError ?? undefined}
                placeholder="Min 8 characters"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
              />

              <Input
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
    backgroundColor: colors.vivid,
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
  appName: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.white,
    letterSpacing: tracking.heading,
  },
  card: {
    width: '100%',
    gap: spacing.md,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
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
