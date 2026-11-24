import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { queryClient } from '@/providers/QueryProvider';
import { PREVIEW_LESSON_ID, seedPreviewLesson } from '@/lib/previewLesson';
import { nextNewUserHome, useNewUserHomeStore } from '@/store/newUserHome.store';
import { Icon } from '@/components/ui/Icon';
import { sectionHeadingStyle } from '@/components/ui/sectionHeading';
import { settingsRow, CHEVRON_SIZE } from '@/components/profile/settingsRow';
import type { ClockTime, NotificationTimeKey, NotificationToggleKey, NotificationToggles } from '@learning/shared';
import {
  DEFAULT_RECAP_TIME, DEFAULT_REMINDER_TIME, NOTIFICATION_TOGGLE_KEYS, formatPreferredTime, initialsOf, notificationTogglesOf,
  parsePreferredTime, recapTimeOf,
} from '@learning/shared';
import { colors, font, fontSize, press, spacing } from '@/theme';
import { TAB_BAR_CLEARANCE, TAB_SCREEN_EDGES } from '@/lib/safeArea';
import { EdgeButton, PRIMARY_EDGE_LOOK } from '@/components/ui/EdgeButton';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useSavedLessons } from '@/hooks/useLesson';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePushStatus } from '@/hooks/usePushStatus';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';
import { extractError } from '@/lib/errors';
import { openManageSubscriptions } from '@/lib/subscriptions';
import { Toast } from '@/components/ui/Toast';
import { DeleteAccountModal } from '@/components/profile/DeleteAccountModal';
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { lessonRoute } from '@/lib/routes';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    <Pressable testID="push-status-prompt" onPress={onRegister} style={styles.notice} accessibilityRole="button">
      <Icon name="reminder" size={20} color={colors.altitudeDark} />
      <Text style={styles.noticeText}>Notifications are off on this phone</Text>
      <Text style={styles.turnOn}>Turn on</Text>
    </Pressable>
  );
}

function isSameTime(a: ClockTime, b: ClockTime): boolean {
  return a.hour === b.hour && a.minute === b.minute;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const newUserHome = useNewUserHomeStore(s => s.variant);
  const setNewUserHome = useNewUserHomeStore(s => s.setVariant);
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
  const [times, setTimes] = useState<Record<NotificationTimeKey, ClockTime>>({ reminder: DEFAULT_REMINDER_TIME, recap: DEFAULT_RECAP_TIME });
  const [savedToastHidden, setSavedToastHidden] = useState(false);

  useEffect(() => {
    if (prefs) {
      setToggles(notificationTogglesOf(prefs));
      setTimes((current) => ({ ...current, recap: recapTimeOf(prefs) }));
    }
  }, [prefs]);

  useEffect(() => {
    const saved = parsePreferredTime(profile?.preferredTime);
    if (saved) setTimes((current) => ({ ...current, reminder: saved }));
  }, [profile]);

  function handleToggle(field: NotificationToggleKey, on: boolean) {
    setToggles((current) => current && { ...current, [field]: on });
  }

  function handleTimeChange(which: NotificationTimeKey, time: ClockTime) {
    setTimes((current) => ({ ...current, [which]: time }));
  }

  function handleSaveSettings() {
    setSavedToastHidden(false);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    updateProfile.mutate({ preferredTime: formatPreferredTime(times.reminder), timezone });
    // Never after a failed load: that would write defaults over what the person chose.
    if (toggles) updatePrefs.mutate({ ...toggles, weeklyRecapTime: formatPreferredTime(times.recap) });
  }

  // Nothing to save until a toggle or the time differs from what is stored. A person who has never
  // saved a time can save the one shown.
  const savedToggles = prefs ? notificationTogglesOf(prefs) : null;
  const savedReminder = parsePreferredTime(profile?.preferredTime);
  const togglesChanged = !!toggles && !!savedToggles
    && NOTIFICATION_TOGGLE_KEYS.some(k => toggles[k] !== savedToggles[k]);
  const reminderChanged = profile ? !savedReminder || !isSameTime(savedReminder, times.reminder) : false;
  const recapChanged = !!prefs && !isSameTime(recapTimeOf(prefs), times.recap);
  const hasChanges = togglesChanged || reminderChanged || recapChanged;

  const isSaving = updatePrefs.isPending || updateProfile.isPending;
  const isSaveSuccess = updatePrefs.isSuccess && updateProfile.isSuccess;
  const isSaveError = updatePrefs.isError || updateProfile.isError;
  const saveError = updatePrefs.error ?? updateProfile.error;

  // The saved toast clears itself.
  useAutoDismiss(isSaveSuccess, () => setSavedToastHidden(true), SAVED_TOAST_MS);

  const savedLessons = savedData ?? [];

  return (
    <SafeAreaView style={styles.container} edges={TAB_SCREEN_EDGES}>
      {/* ── Avatar + header: fixed, so it stays at the top while the page scrolls ── */}
      <View style={styles.header}>
        <View style={styles.avatarEdge}>
          <View style={styles.avatar} testID="avatar-initials">
            <Text style={styles.avatarText}>{user ? initialsOf(user.name) : '?'}</Text>
          </View>
        </View>
        {user && (
          <View style={styles.headerText}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]} showsVerticalScrollIndicator={false}>

        {/* ── Saved lessons ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
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
                <Icon name="saved" size={20} fill={colors.brand} color={colors.brand} />
                <View style={styles.savedText}>
                  <Text style={styles.savedTitle} numberOfLines={2}>{lesson.title}</Text>
                  <Text style={styles.savedMeta}>{lesson.skillName}{lesson.topicName ? ` · ${lesson.topicName}` : ''}</Text>
                </View>
                <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
              </Pressable>
            ))}
          </View>
        )}
        </View>

        {/* ── Reminders ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
        <Text style={styles.sectionHeading}>Reminders</Text>

        <PushPermissionStatus status={permissionStatus} onRegister={register} />
        {pushError ? (
          <Text testID="push-status-error" style={styles.errorMsg}>{pushError}</Text>
        ) : null}

        <NotificationSettings
          toggles={toggles}
          loading={prefsLoading}
          onToggle={handleToggle}
          times={times}
          onTimeChange={handleTimeChange}
        />

        {/* The one blue button on the page; nothing to save until something changes (096). */}
        <View style={styles.saveBtn}>
          <EdgeButton
            testID="save-settings-btn"
            look={PRIMARY_EDGE_LOOK}
            disabledLook={{ face: colors.border, label: colors.textSubtle }}
            label="Save changes"
            onPress={handleSaveSettings}
            loading={isSaving}
            disabled={!hasChanges}
          />
        </View>

        {isSaveError && (
          <Text testID="settings-error" style={styles.errorMsg}>{extractError(saveError)}</Text>
        )}
        </View>

        {/* ── Account ───────────────────────────────────────────────────────── */}
        <View style={styles.section}>
        <Text style={styles.sectionHeading}>Account</Text>

        <Pressable
          testID="manage-subscription-btn"
          onPress={openManageSubscriptions}
          style={[settingsRow.row, settingsRow.first]}
        >
          <Text style={settingsRow.label}>Manage subscription</Text>
          <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
        </Pressable>

        {__DEV__ && (
          <Pressable
            testID="topic-feedback-preview-btn"
            onPress={() => router.push('/topic-feedback-preview')}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview topic feedback (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="albert-suggestion-preview-btn"
            onPress={() => router.push('/albert-suggestion-preview' as Href)}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview Albert suggestion (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="completed-lesson-preview-btn"
            onPress={() => {
              seedPreviewLesson(queryClient);
              router.push(`/lesson/${PREVIEW_LESSON_ID}`);
            }}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview completed lesson (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="quiz-already-completed-preview-btn"
            onPress={() => router.push('/quiz-already-completed-preview' as Href)}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview quiz already completed (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="old-style-preview-btn"
            onPress={() => router.push('/old-style-preview' as Href)}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview old-style buttons (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="native-tabs-preview-btn"
            onPress={() => router.push('/native-tabs-test' as Href)}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview native tabs (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="landmark-arrival-preview-btn"
            onPress={() => router.push('/landmark-arrival-preview' as Href)}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview landmark arrival: Scafell Pike (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="landmark-arrival-big-ben-preview-btn"
            onPress={() => router.push('/landmark-arrival-big-ben-preview' as Href)}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>Preview landmark arrival: Big Ben (dev)</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        {__DEV__ && (
          <Pressable
            testID="new-user-home-switch-btn"
            onPress={() => setNewUserHome(nextNewUserHome(newUserHome))}
            style={settingsRow.row}
            accessibilityRole="button"
          >
            <Text style={settingsRow.label}>New-user Home layout (dev): {newUserHome}</Text>
            <Icon name="forward" size={CHEVRON_SIZE} color={colors.textSubtle} strokeWidth={2.2} />
          </Pressable>
        )}

        <Pressable
          testID="logout-btn"
          onPress={() => logout.mutate()}
          disabled={logout.isPending}
          style={settingsRow.row}
          accessibilityRole="button"
        >
          <Text style={settingsRow.label}>Log out</Text>
        </Pressable>

        <Pressable
          testID="delete-account-btn"
          onPress={() => setDeleteModalOpen(true)}
          style={[settingsRow.row, styles.deleteRow]}
          accessibilityRole="button"
        >
          <Text style={[settingsRow.label, styles.deleteAccountText]}>Delete account</Text>
        </Pressable>
        </View>

      </ScrollView>

      {isSaveSuccess && (
        <View style={styles.toast} pointerEvents="box-none">
          <Toast message="Settings saved" variant="success" visible={!savedToastHidden} />
        </View>
      )}

      {deleteModalOpen && (
        <DeleteAccountModal onClose={() => setDeleteModalOpen(false)} />
      )}

    </SafeAreaView>
  );
}

/** The gap between the page's blocks (the board's 22). */
const BLOCK_GAP = 22;
const SAVED_TOAST_MS = 3000;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: BLOCK_GAP },
  // A heading with its list under it.
  section:   { gap: 6 },

  // Header: avatar left, name and email beside it
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop:        10,
    paddingBottom:     14,
  },
  avatarEdge: {
    backgroundColor: press.onCobaltEdge,
    borderRadius:    22,
    paddingBottom:   press.edge,
  },
  avatar: {
    width:           64,
    height:          64,
    borderRadius:    22,
    backgroundColor: colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontFamily: font.black,
    fontSize:   23,
    color:      colors.onBrand,
  },
  headerText: { flex: 1, gap: 2 },
  name: {
    fontFamily:    font.black,
    fontSize:      24,
    letterSpacing: -0.03 * 24,
    color:         colors.textStrong,
  },
  email: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  sectionHeading: sectionHeadingStyle,

  // The notifications-off notice: one line with Turn on
  notice: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    paddingTop:        10,
    paddingBottom:     12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noticeText: {
    flex:       1,
    fontFamily: font.bold,
    fontSize:   15,
    color:      colors.textStrong,
  },
  turnOn: {
    fontFamily: font.extrabold,
    fontSize:   15,
    color:      colors.textLink,
  },

  // Saved lessons
  savedRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    paddingVertical: 10,
  },
  savedText: { flex: 1, gap: 2 },
  savedTitle: {
    fontFamily: font.bold,
    fontSize:   15,
    lineHeight: 15 * 1.3,
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
  // The saved toast floats over the top of the page.
  toast: { position: 'absolute', top: spacing.sm, left: 20, right: 20 },
  errorMsg: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
    textAlign:  'center',
    marginTop:  spacing.sm,
  },

  // Account
  // Delete account is red and set apart from the rest.
  deleteRow:         { marginTop: spacing.md },
  deleteAccountText: { color: colors.error },
});
