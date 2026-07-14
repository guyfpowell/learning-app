import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import { useProfile, useUpdateProfile } from '@/hooks/useOnboarding';
import { usePushStatus } from '@/hooks/usePushStatus';
import { extractError } from '@/lib/errors';

function timeToDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { permissionStatus, register } = usePushStatus();

  const [enableDailyReminder, setEnableDailyReminder] = useState(false);
  const [preferredHour, setPreferredHour] = useState(8);
  const [preferredMinute, setPreferredMinute] = useState(0);
  const [enableStreak, setEnableStreak] = useState(true);
  const [enableLessonAvailable, setEnableLessonAvailable] = useState(true);

  useEffect(() => {
    if (data) {
      setEnableDailyReminder(data.enableDailyReminder);
      setEnableStreak(data.enableStreak);
      setEnableLessonAvailable(data.enableLessonAvailable);
    }
  }, [data]);

  useEffect(() => {
    if (profile?.preferredTime && /^\d{2}:\d{2}$/.test(profile.preferredTime)) {
      const [h, m] = profile.preferredTime.split(':').map(Number);
      setPreferredHour(h);
      setPreferredMinute(m);
    }
  }, [profile]);

  function handleSave() {
    const hh = String(preferredHour).padStart(2, '0');
    const mm = String(preferredMinute).padStart(2, '0');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    updateProfile.mutate({ preferredTime: `${hh}:${mm}`, timezone });
    updatePrefs.mutate({ enableDailyReminder, enableStreak, enableLessonAvailable });
  }

  const isSaving = updatePrefs.isPending || updateProfile.isPending;
  const isSaveSuccess = updatePrefs.isSuccess && updateProfile.isSuccess;
  const isSaveError = updatePrefs.isError || updateProfile.isError;
  const saveError = updatePrefs.error ?? updateProfile.error;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Settings</Text>

        {/* Profile */}
        <Text style={styles.sectionLabel}>Profile</Text>
        {user && (
          <Card style={styles.card}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </Card>
        )}

        {/* Push Notifications */}
        <Text style={styles.sectionLabel}>Push Notifications</Text>
        <Card style={styles.card}>
          {permissionStatus === 'granted' ? (
            <Text testID="push-status-enabled" style={styles.pushEnabledText}>
              Push notifications are enabled
            </Text>
          ) : permissionStatus === 'denied' ? (
            <Text testID="push-status-blocked" style={styles.pushBlockedText}>
              Notifications are blocked. Enable them in your device settings.
            </Text>
          ) : (
            <View testID="push-status-prompt">
              <Button label="Enable notifications" onPress={register} />
            </View>
          )}
        </Card>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <Card style={styles.card}>
          {isLoading ? (
            <View testID="prefs-loading" style={styles.loadingRow}>
              <Spinner size="small" />
            </View>
          ) : (
            <>
              {/* Daily reminder */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Daily reminder</Text>
                <Switch
                  testID="toggle-daily-reminder"
                  value={enableDailyReminder}
                  onValueChange={setEnableDailyReminder}
                  trackColor={{ true: colors.teal }}
                  thumbColor={colors.white}
                />
              </View>

              {enableDailyReminder && (
                <DateTimePicker
                  testID="reminder-time-picker"
                  value={timeToDate(preferredHour, preferredMinute)}
                  mode="time"
                  display="spinner"
                  onChange={(_event: DateTimePickerEvent, date: Date | undefined) => {
                    if (!date) return;
                    setPreferredHour(date.getHours());
                    setPreferredMinute(date.getMinutes());
                  }}
                />
              )}

              <View style={styles.divider} />

              {/* Streak milestones */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Streak milestones</Text>
                <Switch
                  testID="toggle-streak"
                  value={enableStreak}
                  onValueChange={setEnableStreak}
                  trackColor={{ true: colors.teal }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.divider} />

              {/* New lesson available */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>New lesson available</Text>
                <Switch
                  testID="toggle-lesson-available"
                  value={enableLessonAvailable}
                  onValueChange={setEnableLessonAvailable}
                  trackColor={{ true: colors.teal }}
                  thumbColor={colors.white}
                />
              </View>
            </>
          )}
        </Card>

        <Button
          label="Save Settings"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveBtn}
        />

        {isSaveSuccess && (
          <Text style={styles.successMsg}>Settings saved</Text>
        )}
        {isSaveError && (
          <Text testID="settings-error" style={styles.errorMsg}>{extractError(saveError)}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: { marginBottom: spacing.sm },
  userName: {
    fontFamily: font.bold,
    fontSize: fontSize.md,
    color: colors.textDark,
  },
  userEmail: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.textDark,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  pushEnabledText: {
    fontFamily: font.medium,
    fontSize: fontSize.base,
    color: colors.success,
    paddingVertical: spacing.xs,
  },
  pushBlockedText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  saveBtn: { marginTop: spacing.lg },
  successMsg: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorMsg: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
