import { Fragment, useState } from 'react';
import { View, StyleSheet, Switch, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { settingsRow, CHEVRON_SIZE } from '@/components/profile/settingsRow';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import {
  NOTIFICATION_SETTINGS_LOAD_ERROR, NOTIFICATION_TIMED_TOGGLES, NOTIFICATION_TIME_LABEL, NOTIFICATION_TOGGLE_LABELS, formatPreferredTime,
  NOTIFICATION_TOGGLES_BELOW_REMINDER, type ClockTime, type NotificationTimeKey, type NotificationToggleKey, type NotificationToggles,
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
  first = false,
}: {
  field: NotificationToggleKey;
  first?: boolean;
  value: boolean;
  onToggle: (field: NotificationToggleKey, on: boolean) => void;
}) {
  const label = NOTIFICATION_TOGGLE_LABELS[field];
  return (
    <View style={[settingsRow.row, first && settingsRow.first]}>
      <Text style={settingsRow.label}>{label}</Text>
      <Switch
        testID={`toggle-${field}`}
        accessibilityLabel={label}
        value={value}
        onValueChange={(on) => onToggle(field, on)}
        trackColor={{ true: colors.brand, false: colors.border }}
        ios_backgroundColor={colors.border}
        thumbColor={colors.white}
      />
    </View>
  );
}

/** One time row: the label and time, and the native wheel, which stays out of the way until the row is tapped (096). The text inside names the row. */
function TimeRow({
  which,
  time,
  onChange,
}: {
  which: NotificationTimeKey;
  time: ClockTime;
  onChange: (which: NotificationTimeKey, time: ClockTime) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        testID={`${which}-time-row`}
        onPress={() => setOpen(current => !current)}
        style={settingsRow.row}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={settingsRow.label}>{NOTIFICATION_TIME_LABEL[which]}</Text>
        <View style={styles.timeValue}>
          <Text testID={`${which}-time-value`} style={styles.timeText}>{formatPreferredTime(time)}</Text>
          <Icon name={open ? 'expand' : 'forward'} size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
        </View>
      </Pressable>
      {open && (
        <DateTimePicker
          testID={`${which}-time-picker`}
          value={timeToDate(time)}
          mode="time"
          display="spinner"
          onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
            onChange(which, { hour: date.getHours(), minute: date.getMinutes() });
          }}
        />
      )}
    </>
  );
}

/**
 * The notification toggles, each timed one with its time under it while it is on (the daily reminder, the weekly recap).
 * `toggles` is null while loading or after a failed load; a failed load says so rather than showing defaults a save would write.
 */
export function NotificationSettings({
  toggles,
  loading,
  onToggle,
  times,
  onTimeChange,
}: {
  toggles: NotificationToggles | null;
  loading: boolean;
  onToggle: (field: NotificationToggleKey, on: boolean) => void;
  times: Record<NotificationTimeKey, ClockTime>;
  onTimeChange: (which: NotificationTimeKey, time: ClockTime) => void;
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
      {NOTIFICATION_TIMED_TOGGLES.map(({ field, time }, i) => (
        <Fragment key={field}>
          <PreferenceToggle first={i === 0} field={field} value={toggles[field]} onToggle={onToggle} />
          {toggles[field] && <TimeRow which={time} time={times[time]} onChange={onTimeChange} />}
        </Fragment>
      ))}

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
  timeValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeText: {
    fontFamily: font.extrabold,
    fontSize:   16,
    color:      colors.textBody,
  },
});
