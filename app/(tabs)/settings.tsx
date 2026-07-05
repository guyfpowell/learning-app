import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, fontSize, spacing, radius } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';

type ReminderTime = 'morning' | 'afternoon' | 'evening';

const REMINDER_TIMES: { value: ReminderTime; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const [enableDailyReminder, setEnableDailyReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState<ReminderTime>('morning');
  const [enableStreak, setEnableStreak] = useState(true);
  const [enableLessonAvailable, setEnableLessonAvailable] = useState(true);

  useEffect(() => {
    if (data) {
      setEnableDailyReminder(data.enableDailyReminder);
      setReminderTime(data.reminderTime ?? 'morning');
      setEnableStreak(data.enableStreak);
      setEnableLessonAvailable(data.enableLessonAvailable);
    }
  }, [data]);

  function handleSave() {
    updatePrefs.mutate({
      enableDailyReminder,
      reminderTime: enableDailyReminder ? reminderTime : undefined,
      enableStreak,
      enableLessonAvailable,
    });
  }

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
                <View style={styles.timePicker}>
                  {REMINDER_TIMES.map(({ value, label }) => (
                    <Pressable
                      key={value}
                      onPress={() => setReminderTime(value)}
                      style={[styles.timeBtn, reminderTime === value && styles.timeBtnSelected]}
                    >
                      <Text
                        style={[
                          styles.timeBtnText,
                          reminderTime === value && styles.timeBtnTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
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
          loading={updatePrefs.isPending}
          style={styles.saveBtn}
        />

        {updatePrefs.isSuccess && (
          <Text style={styles.successMsg}>Settings saved</Text>
        )}
        {updatePrefs.isError && (
          <Text style={styles.errorMsg}>Failed to save settings. Please try again.</Text>
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
  timePicker: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.btn,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  timeBtnSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.teal + '15',
  },
  timeBtnText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  timeBtnTextSelected: {
    color: colors.teal,
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
