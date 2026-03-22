import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '@/components/ui/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSetPassword } from '@/hooks/useAuth';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

function extractError(err: unknown): string {
  const typed = err as { response?: { data?: { error?: string } } };
  return typed?.response?.data?.error ?? 'Something went wrong. Please try again.';
}

function validate(currentPin: string, newPassword: string, confirmPassword: string) {
  const errors: { currentPin?: string; newPassword?: string; confirmPassword?: string } = {};
  if (!currentPin.trim()) errors.currentPin = 'Current PIN is required';
  if (!newPassword) errors.newPassword = 'New password is required';
  else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
  else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function SetPasswordScreen() {
  const setPassword = useSetPassword();

  const [currentPin, setCurrentPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({
    currentPin: false,
    newPassword: false,
    confirmPassword: false,
  });

  const errors = validate(currentPin, newPassword, confirmPassword);
  const displayErrors = {
    currentPin: touched.currentPin ? errors.currentPin : undefined,
    newPassword: touched.newPassword ? errors.newPassword : undefined,
    confirmPassword: touched.confirmPassword ? errors.confirmPassword : undefined,
  };

  function handleSubmit() {
    setTouched({ currentPin: true, newPassword: true, confirmPassword: true });
    if (Object.keys(validate(currentPin, newPassword, confirmPassword)).length > 0) return;
    setPassword.mutate({ currentPin: currentPin.trim(), newPassword });
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
          <Logo size={80} />
          <Text style={styles.appName}>POCKET CHANGE</Text>

          <Card style={styles.card}>
            <Text style={styles.heading}>Set your password</Text>
            <Text style={styles.sub}>
              Your vendor has set a temporary PIN for you. Enter it below and choose a permanent password to secure your account.
            </Text>

            {setPassword.isError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>
                  {extractError(setPassword.error)}
                </Text>
              </View>
            )}

            <View style={styles.fields}>
              <Input
                label="Temporary PIN"
                value={currentPin}
                onChangeText={setCurrentPin}
                onBlur={() => setTouched((t) => ({ ...t, currentPin: true }))}
                error={displayErrors.currentPin}
                placeholder="Enter your temporary PIN"
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="next"
              />

              <Input
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
                error={displayErrors.newPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
              />

              <Input
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                error={displayErrors.confirmPassword}
                placeholder="Repeat your new password"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <Button
              label="Set password"
              onPress={handleSubmit}
              loading={setPassword.isPending}
              style={styles.submitBtn}
            />
          </Card>
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
  fields: {
    gap: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
});
