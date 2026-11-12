import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { Input } from '@/components/ui/Input';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { useLogin } from '@/hooks/useAuth';
import { colors, font, fontSize, press, radius, spacing } from '@/theme';
import { extractError } from '@/lib/errors';
import { isValidEmail, normaliseEmail } from '@learning/shared';

export { extractError };

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!isValidEmail(email)) return 'Enter a valid email address';
  return null;
}

function validatePassword(password: string): string | null {
  // Sign-in only needs a password: the strength rules apply when one is set, as on the server (080j).
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
    login.mutate({ email: normaliseEmail(email), password });
  }

  return (
    <AuthFrame
      title="Sign in"
      intro="Welcome back. Sign in to continue learning."
      footerLead="Don't have an account?"
      footerAction="Create one"
      onFooter={() => router.push('/(auth)/register')}
    >
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

      <EdgeButton
        testID="signin-submit"
        look={{ face: colors.brand, label: colors.onBrand, edge: press.primaryEdge }}
        label="Sign in"
        onPress={handleSubmit}
        loading={login.isPending}
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
  fields: {
    gap: 16,
  },
});
