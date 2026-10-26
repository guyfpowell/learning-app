import { View, Text, StyleSheet, Switch } from 'react-native';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import {
  NOTIFICATION_SETTINGS_LOAD_ERROR, NOTIFICATION_TOGGLE_LABELS, NOTIFICATION_TOGGLES_BELOW_REMINDER,
  type ClockTime, type NotificationToggleKey, type NotificationToggles,
} from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { Spinner } from '@/components/ui/Spinner';

function timeToDate({ hour, minute }: ClockTime): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** One labelled switch. A native Switch is not named by the Text beside it, so it carries the label itself. */
function PreferenceToggle({
  field,
  value,
  onToggle,
}: {
  field: NotificationToggleKey;
  value: boolean;
  onToggle: (field: NotificationToggleKey, on: boolean) => void;
}) {
  const label = NOTIFICATION_TOGGLE_LABELS[field];
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        testID={`toggle-${field}`}
        accessibilityLabel={label}
        value={value}
        onValueChange={(on) => onToggle(field, on)}
        trackColor={{ true: colors.brand }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

/**
 * The notification toggles and the daily reminder time. `toggles` is null while loading or after a
 * failed load; a failed load says so rather than showing defaults a save would write.
 */
export function NotificationSettings({
  toggles,
  loading,
  onToggle,
  reminder,
  onReminderChange,
}: {
  toggles: NotificationToggles | null;
  loading: boolean;
  onToggle: (field: NotificationToggleKey, on: boolean) => void;
  reminder: ClockTime;
  onReminderChange: (reminder: ClockTime) => void;
}) {
  if (loading) {
    return (
      <View testID="prefs-loading" style={styles.loadingRow}>
        <Spinner size="small" />
      </View>
    );
  }
  if (!toggles) {
    return <Text testID="prefs-error" style={styles.loadError}>{NOTIFICATION_SETTINGS_LOAD_ERROR}</Text>;
  }

  return (
    <>
      <PreferenceToggle field="enableDailyReminder" value={toggles.enableDailyReminder} onToggle={onToggle} />

      {toggles.enableDailyReminder && (
        <DateTimePicker
          testID="reminder-time-picker"
          value={timeToDate(reminder)}
          mode="time"
          display="spinner"
          onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
            onReminderChange({ hour: date.getHours(), minute: date.getMinutes() });
          }}
        />
      )}

      {NOTIFICATION_TOGGLES_BELOW_REMINDER.map((field) => (
        <View key={field}>
          <View style={styles.divider} />
          <PreferenceToggle field={field} value={toggles[field]} onToggle={onToggle} />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  loadingRow: { alignItems: 'center', paddingVertical: spacing.md },
  loadError: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
    textAlign:  'center',
  },
  toggleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
    flex:       1,
  },
  divider: {
    height:          1,
    backgroundColor: colors.borderSubtle,
    marginVertical:  spacing.xs,
  },
});
