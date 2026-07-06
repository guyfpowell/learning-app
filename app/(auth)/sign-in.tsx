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
import { useLogin } from '@/hooks/useAuth';
import { colors, font, fontSize, spacing } from '@/theme';
import { extractError } from '@/lib/errors';

export { extractError };

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  return null;
}

export default function SignInScreen() {
  const router = useRouter();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError    = touched.email    ? validateEmail(email)       : null;
  const passwordError = touched.password ? validatePassword(password) : null;

  function handleSubmit() {
    setTouched({ email: true, password: true });
    if (validateEmail(email) || validatePassword(password)) return;
    login.mutate({ email: email.trim().toLowerCase(), password });
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
            <Text style={styles.heading}>Sign in</Text>
            <Text style={styles.sub}>
              Welcome back. Sign in to continue learning.
            </Text>

            {login.isError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  {extractError(login.error)}
                </Text>
              </View>
            )}

            <View style={styles.fields}>
              <Input
                testID="signin-email"
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
                testID="signin-password"
                label="Password"
                value={password}
                onChangeText={setPassword}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={passwordError ?? undefined}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <Button
              testID="signin-submit"
              label="Sign in"
              onPress={handleSubmit}
              loading={login.isPending}
              style={styles.submitBtn}
            />
          </Card>

          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.link}>
              {"Don't have an account? "}
              <Text style={styles.linkBold}>Create one</Text>
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
