import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ClockTime, NotificationToggleKey, NotificationToggles } from '@learning/shared';
import {
  DEFAULT_REMINDER_TIME, formatPreferredTime, notificationTogglesOf,
  parsePreferredTime,
} from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useSavedLessons } from '@/hooks/useLesson';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePushStatus } from '@/hooks/usePushStatus';
import { extractError } from '@/lib/errors';
import { openManageSubscriptions } from '@/lib/subscriptions';
import { DeleteAccountModal } from '@/components/profile/DeleteAccountModal';
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { lessonRoute } from '@/lib/routes';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function PushPermissionStatus({
  status,
  onRegister,
}: {
  status: ReturnType<typeof usePushStatus>['permissionStatus'];
  onRegister: () => void;
}) {
  // Granted needs no words: the reminders below just work.
  if (status === 'granted') return null;
  if (status === 'denied') {
    return (
      <Text testID="push-status-blocked" style={styles.pushBlockedText}>
        Notifications are blocked. Enable them in your device settings.
      </Text>
    );
  }
  return (
    <Pressable testID="push-status-prompt" onPress={onRegister} style={[styles.row, styles.rowSpread]} accessibilityRole="button">
      <Text style={styles.rowText}>Notifications are off on this phone</Text>
      <Text style={styles.turnOn}>Turn on</Text>
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const { data: savedData } = useSavedLessons();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // ── Settings (folded in from the deleted Settings tab, 076b) ──────────────
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { permissionStatus, register, error: pushError } = usePushStatus();

  const [toggles, setToggles] = useState<NotificationToggles | null>(null);
  const [reminder, setReminder] = useState<ClockTime>(DEFAULT_REMINDER_TIME);

  useEffect(() => {
    if (prefs) setToggles(notificationTogglesOf(prefs));
  }, [prefs]);

  useEffect(() => {
    const saved = parsePreferredTime(profile?.preferredTime);
    if (saved) setReminder(saved);
  }, [profile]);

  function handleToggle(field: NotificationToggleKey, on: boolean) {
    setToggles((current) => current && { ...current, [field]: on });
  }

  function handleSaveSettings() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    updateProfile.mutate({ preferredTime: formatPreferredTime(reminder), timezone });
    // Never after a failed load: that would write defaults over what the person chose.
    if (toggles) updatePrefs.mutate(toggles);
  }

  // Nothing to save until a toggle or the time differs from what is stored. A person who has never
  // saved a time can save the one shown.
  const savedToggles = prefs ? notificationTogglesOf(prefs) : null;
  const savedReminder = parsePreferredTime(profile?.preferredTime);
  const togglesChanged = !!toggles && !!savedToggles
    && (Object.keys(toggles) as NotificationToggleKey[]).some(k => toggles[k] !== savedToggles[k]);
  const reminderChanged = profile
    ? !savedReminder || savedReminder.hour !== reminder.hour || savedReminder.minute !== reminder.minute
    : false;
  const hasChanges = togglesChanged || reminderChanged;

  const isSaving = updatePrefs.isPending || updateProfile.isPending;
  const isSaveSuccess = updatePrefs.isSuccess && updateProfile.isSuccess;
  const isSaveError = updatePrefs.isError || updateProfile.isError;
  const saveError = updatePrefs.error ?? updateProfile.error;

  const savedLessons = savedData ?? [];

  return (
    <SafeAreaView style={styles.container} edges={TAB_SCREEN_EDGES}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.avatarRing} testID="avatar-initials">
            <Text style={styles.avatarText}>{user ? initials(user.name) : '?'}</Text>
          </View>
          {user && (
            <View style={styles.headerText}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          )}
        </View>

        {/* ── Saved lessons ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Saved</Text>

        {savedLessons.length === 0 ? (
          <Text testID="saved-empty" style={styles.emptyText}>
            No saved lessons yet. Bookmark any lesson to find it here.
          </Text>
        ) : (
          <View>
            {savedLessons.map(lesson => (
              <Pressable
                key={lesson.id}
                testID={`saved-lesson-${lesson.id}`}
                onPress={() => router.push(lessonRoute(lesson.id))}
                style={styles.savedRow}
              >
                <Text style={styles.savedTitle} numberOfLines={2}>{lesson.title}</Text>
                <Text style={styles.savedMeta}>{lesson.skillName}{lesson.topicName ? ` · ${lesson.topicName}` : ''}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Reminders ─────────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Reminders</Text>

        <PushPermissionStatus status={permissionStatus} onRegister={register} />
        {pushError ? (
          <Text testID="push-status-error" style={styles.errorMsg}>{pushError}</Text>
        ) : null}

        <NotificationSettings
          toggles={toggles}
          loading={prefsLoading}
          onToggle={handleToggle}
          reminder={reminder}
          onReminderChange={setReminder}
        />

        {/* The one blue button on the page; nothing to save until something changes (096). */}
        <Button
          label="Save changes"
          onPress={handleSaveSettings}
          loading={isSaving}
          disabled={!hasChanges}
          style={styles.saveBtn}
        />

        {isSaveSuccess && (
          <Text style={styles.successMsg}>Settings saved</Text>
        )}
        {isSaveError && (
          <Text testID="settings-error" style={styles.errorMsg}>{extractError(saveError)}</Text>
        )}

        {/* ── Account ───────────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Account</Text>

        <Pressable
          testID="manage-subscription-btn"
          onPress={openManageSubscriptions}
          style={[styles.row, styles.rowSpread]}
        >
          <Text style={styles.rowText}>Manage subscription</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        <Pressable
          testID="logout-btn"
          onPress={() => logout.mutate()}
          disabled={logout.isPending}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.rowText}>Log out</Text>
        </Pressable>

        <Pressable
          testID="delete-account-btn"
          onPress={() => setDeleteModalOpen(true)}
          style={styles.row}
          accessibilityRole="button"
        >
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </Pressable>

      </ScrollView>

      {deleteModalOpen && (
        <DeleteAccountModal onClose={() => setDeleteModalOpen(false)} />
      )}

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.lg, paddingBottom: spacing.xl2 },

  // Header: avatar left, name and email beside it
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    marginBottom:  spacing.md,
    paddingTop:    spacing.md,
  },
  avatarRing: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: colors.brand,
    borderWidth:     2,
    borderColor:     colors.brandSoft,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontFamily: font.display,
    fontSize:   fontSize.md,
    color:      colors.onBrand,
  },
  headerText: { flex: 1 },
  name: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.md,
    color:        colors.textStrong,
    marginBottom: 2,
  },
  email: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  // One heading style: small grey caps, as on Progress
  sectionHeading: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.sm,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:     spacing.lg,
    marginBottom:  spacing.sm,
  },

  // Hairline rows, no cards
  row: {
    paddingVertical:   spacing.sm3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowSpread: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  rowText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  turnOn: {
    fontFamily: font.medium,
    fontSize:   fontSize.base,
    color:      colors.brand,
  },

  // Saved lessons
  savedRow: {
    paddingVertical:   spacing.sm3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:               2,
  },
  savedTitle: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
  },
  savedMeta: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  emptyText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  // Reminders
  pushBlockedText: {
    fontFamily:      font.regular,
    fontSize:        fontSize.sm,
    color:           colors.textMuted,
    paddingVertical: spacing.sm,
  },
  saveBtn: { marginTop: spacing.lg },
  successMsg: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.success,
    textAlign:  'center',
    marginTop:  spacing.sm,
  },
  errorMsg: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
    textAlign:  'center',
    marginTop:  spacing.sm,
  },

  // Account
  deleteAccountText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
  },
});
