import { useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import {
  NOTIFICATION_SETTINGS_LOAD_ERROR, NOTIFICATION_TOGGLE_LABELS, formatPreferredTime, NOTIFICATION_TOGGLES_BELOW_REMINDER,
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
    <View style={[styles.row, styles.rowSpread]}>
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
  // The wheel is out of the way until the time row is tapped (096).
  const [timeOpen, setTimeOpen] = useState(false);

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
        <>
          <Pressable
            testID="reminder-time-row"
            onPress={() => setTimeOpen(open => !open)}
            style={[styles.row, styles.rowSpread]}
            accessibilityRole="button"
            accessibilityLabel="Reminder time"
            accessibilityState={{ expanded: timeOpen }}
          >
            <Text style={styles.toggleLabel}>Reminder time</Text>
            <View style={styles.timeValue}>
              <Text testID="reminder-time-value" style={styles.timeText}>{formatPreferredTime(reminder)}</Text>
              <Ionicons name={timeOpen ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.textMuted} />
            </View>
          </Pressable>
          {timeOpen && (
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
        </>
      )}

      {NOTIFICATION_TOGGLES_BELOW_REMINDER.map((field) => (
        <PreferenceToggle key={field} field={field} value={toggles[field]} onToggle={onToggle} />
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
  // Hairline rows, no card around them (096).
  row: {
    paddingVertical:   spacing.xs,
    minHeight:         48,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowSpread: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  timeValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timeText: {
    fontFamily: font.medium,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  toggleLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
    flex:       1,
  },
});
