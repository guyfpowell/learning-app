import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import type { AchievementAxis, AchievementDefinition, AchievementKey, UserPath, UserAchievement } from '@learning/shared';
import { ACHIEVEMENTS_BY_KEY } from '@learning/shared';
import { colors, font, fontSize, radius, spacing, shadow } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useProgress } from '@/hooks/useProgress';
import { usePaths } from '@/hooks/useTrack';
import { useSavedLessons } from '@/hooks/useLesson';
import { useAchievements } from '@/hooks/useAchievements';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPrefs';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePushStatus } from '@/hooks/usePushStatus';
import { extractError } from '@/lib/errors';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function flooredPct(path: UserPath): number {
  return path.completedLessons > 0
    ? Math.max(1, Math.round(path.percentComplete))
    : 0;
}

/** Icon name by achievement axis — badge artwork is uncommissioned; axis determines the placeholder. */
const AXIS_ICON: Record<AchievementAxis, keyof typeof Ionicons.glyphMap> = {
  session:     'flash-outline',
  accuracy:    'ribbon-outline',
  improvement: 'trending-up-outline',
  breadth:     'globe-outline',
  depth:       'layers-outline',
  curation:    'bookmark-outline',
  return:      'refresh-outline',
  social:      'people-outline',
  milestone:   'star-outline',
};

type AchievementItem =
  | (UserAchievement & { earned: true })
  | (AchievementDefinition & { earned: false; unlockedAt: undefined });

function timeToDate(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Achievement detail modal ──────────────────────────────────────────────────

function AchievementDetailModal({ item, onClose }: { item: AchievementItem; onClose: () => void }) {
  const iconName = AXIS_ICON[item.axis] ?? 'star-outline';
  const earned = item.earned;
  const def = ACHIEVEMENTS_BY_KEY[item.key as AchievementKey];

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => { /* swallow — keep modal open */ }}>
          <View testID="achievement-detail-modal" style={styles.modalContent}>
            <View style={[styles.modalIconCircle, { backgroundColor: earned ? colors.xpSoft : colors.surfaceSunken }]}>
              <Ionicons name={iconName} size={32} color={earned ? '#BE7C1C' : colors.textSubtle} />
            </View>

            <Text testID="achievement-detail-name" style={styles.modalName}>{item.name}</Text>

            <Text testID="achievement-detail-description" style={styles.modalDescription}>{item.description}</Text>

            {earned && item.unlockedAt && (
              <Text testID="achievement-detail-earned-date" style={styles.modalEarnedDate}>
                Earned {formatDate(item.unlockedAt)}
              </Text>
            )}

            {def?.xpThreshold && (
              <Text testID="achievement-detail-xp" style={styles.modalXp}>
                {def.xpThreshold.toLocaleString()} XP
              </Text>
            )}

            <Pressable testID="achievement-detail-close" onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseTxt}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const { data: progress } = useProgress();
  const { data: pathsData } = usePaths();
  const { data: savedData } = useSavedLessons();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();

  const [selectedKey, setSelectedKey] = useState<AchievementKey | null>(null);

  // ── Settings (folded in from the deleted Settings tab, 076b) ──────────────
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences();
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
    if (prefs) {
      setEnableDailyReminder(prefs.enableDailyReminder);
      setEnableStreak(prefs.enableStreak);
      setEnableLessonAvailable(prefs.enableLessonAvailable);
    }
  }, [prefs]);

  useEffect(() => {
    if (profile?.preferredTime && /^\d{2}:\d{2}$/.test(profile.preferredTime)) {
      const [h, m] = profile.preferredTime.split(':').map(Number);
      setPreferredHour(h);
      setPreferredMinute(m);
    }
  }, [profile]);

  function handleSaveSettings() {
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

  const activePaths = pathsData?.filter(p => p.percentComplete < 100) ?? [];
  const savedLessons = savedData ?? [];
  const totalUnlocked = achievements?.totalUnlocked ?? 0;

  const allAchievements: AchievementItem[] = [
    ...(achievements?.unlocked.map(a => ({ ...a, earned: true as const })) ?? []),
    ...(achievements?.locked.map(a => ({ ...a, earned: false as const, unlockedAt: undefined })) ?? []),
  ];

  const selectedItem = selectedKey ? (allAchievements.find(a => a.key === selectedKey) ?? null) : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.avatarRing} testID="avatar-initials">
            <Text style={styles.avatarText}>{user ? initials(user.name) : '?'}</Text>
          </View>
          {user && (
            <>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </>
          )}
        </View>

        {/* ── Stat tiles ───────────────────────────────────────────────────── */}
        <View style={styles.statRow}>
          <Card padding={spacing.md} style={styles.statCard}>
            <Text testID="profile-streak" style={styles.statValue}>
              {progress?.currentStreak ?? 0}
            </Text>
            <Text style={styles.statLabel}>day streak</Text>
          </Card>

          <Card padding={spacing.md} style={styles.statCard}>
            <Text testID="profile-lessons" style={styles.statValue}>
              {progress?.totalLessonsCompleted ?? 0}
            </Text>
            <Text style={styles.statLabel}>lessons</Text>
          </Card>

          <Card padding={spacing.md} style={styles.statCard}>
            <Text testID="profile-achievement-count" style={styles.statValue}>
              {totalUnlocked}
            </Text>
            <Text style={styles.statLabel}>achievements</Text>
          </Card>
        </View>

        {/* ── Achievements grid ─────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Achievements</Text>

        {achievementsLoading && <Spinner />}

        {!achievementsLoading && allAchievements.length > 0 && (
          <View style={styles.achievementGrid}>
            {allAchievements.map(a => {
              const iconName = AXIS_ICON[a.axis] ?? 'star-outline';
              const earned = a.earned;
              return (
                <Pressable
                  key={a.key}
                  testID={`achievement-${a.key}`}
                  onPress={() => setSelectedKey(a.key as AchievementKey)}
                  style={[styles.achievementCard, shadow.card, { opacity: earned ? 1 : 0.45 }]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: earned ? colors.xpSoft : colors.surfaceSunken }]}>
                    <Ionicons
                      name={iconName}
                      size={22}
                      color={earned ? '#BE7C1C' : colors.textSubtle}
                    />
                  </View>
                  <Text style={styles.achievementName} numberOfLines={2}>{a.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Saved lessons ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Saved</Text>

        {savedLessons.length === 0 ? (
          <Card testID="saved-empty" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No saved lessons yet. Bookmark any lesson to find it here.</Text>
          </Card>
        ) : (
          <View style={styles.savedList}>
            {savedLessons.map(lesson => (
              <Pressable
                key={lesson.id}
                testID={`saved-lesson-${lesson.id}`}
                onPress={() => router.push(`/(tabs)/lesson/${lesson.id}` as never)}
              >
                <Card padding={spacing.md} style={styles.savedCard}>
                  <Text style={styles.savedTitle} numberOfLines={2}>{lesson.title}</Text>
                  <Text style={styles.savedMeta}>{lesson.skillName}{lesson.topicName ? ` · ${lesson.topicName}` : ''}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Track progress ────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Track progress</Text>

        {activePaths.length === 0 ? (
          <Card testID="profile-no-tracks" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tracks enrolled yet.</Text>
          </Card>
        ) : (
          <View style={styles.trackList}>
            {activePaths.map(e => {
              const pct = flooredPct(e);
              return (
                <View key={`${e.kind}-${e.id}`} style={styles.trackItem}>
                  <View style={styles.trackRow}>
                    <Text style={styles.trackName}>{e.name}</Text>
                    <Text style={styles.trackPct}>{pct}%</Text>
                  </View>
                  {/* .asc-progress bar — track + fill */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Settings ──────────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Settings</Text>

        <Text style={styles.settingsLabel}>Push Notifications</Text>
        <Card style={styles.settingsCard}>
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

        <Text style={styles.settingsLabel}>Notifications</Text>
        <Card style={styles.settingsCard}>
          {prefsLoading ? (
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
                  trackColor={{ true: colors.brand }}
                  thumbColor={colors.surface}
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
                  trackColor={{ true: colors.brand }}
                  thumbColor={colors.surface}
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
                  trackColor={{ true: colors.brand }}
                  thumbColor={colors.surface}
                />
              </View>
            </>
          )}
        </Card>

        <Button
          label="Save Settings"
          onPress={handleSaveSettings}
          loading={isSaving}
          style={styles.saveBtn}
        />

        {isSaveSuccess && (
          <Text style={styles.successMsg}>Settings saved</Text>
        )}
        {isSaveError && (
          <Text testID="settings-error" style={styles.errorMsg}>{extractError(saveError)}</Text>
        )}

        {/* ── Subscription ──────────────────────────────────────────────────── */}
        <Text style={styles.settingsLabel}>Subscription</Text>
        <Card style={styles.settingsCard}>
          <Pressable
            testID="manage-subscription-btn"
            onPress={() => Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')}
            style={styles.manageSubRow}
          >
            <Text style={styles.manageSubText}>Manage Subscription</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </Card>

        {/* ── Log out ───────────────────────────────────────────────────────── */}
        <Button
          label="Log Out"
          variant="outline"
          style={styles.logoutBtn}
          loading={logout.isPending}
          onPress={() => logout.mutate()}
        />

      </ScrollView>

      {selectedKey && selectedItem && (
        <AchievementDetailModal item={selectedItem} onClose={() => setSelectedKey(null)} />
      )}

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const GRID_GAP = 10;
const GRID_COLS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content:   { padding: spacing.lg, paddingBottom: spacing.xl2 },

  // Header
  header: {
    alignItems:    'center',
    textAlign:     'center' as never,
    marginBottom:  spacing.lg,
    paddingTop:    spacing.md,
  } as never,
  avatarRing: {
    width:           74,
    height:          74,
    borderRadius:    37,
    backgroundColor: colors.brand,
    borderWidth:     3,
    borderColor:     colors.brandSoft,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.sm,
  },
  avatarText: {
    fontFamily: font.display,
    fontSize:   fontSize.lg,
    color:      colors.onBrand,
    lineHeight: 28,
  },
  name: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.md,
    color:        colors.textStrong,
    marginBottom: 2,
    textAlign:    'center',
  },
  email: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },

  // Stat row
  statRow: {
    flexDirection: 'row',
    gap:           GRID_GAP,
    marginBottom:  spacing.lg,
  },
  statCard: {
    flex:       1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: font.display,
    fontSize:   fontSize.xxl - 8,   // 28pt numeric display
    color:      colors.textStrong,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    marginTop:  2,
  },

  // Section headings
  sectionHeading: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.base,
    color:        colors.textStrong,
    marginBottom: spacing.sm,
    marginTop:    spacing.sm,
  },

  // Achievements
  achievementGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            GRID_GAP,
    marginBottom:   spacing.lg,
  },
  achievementCard: {
    width:           `${(100 - GRID_GAP * (GRID_COLS - 1) / GRID_COLS)}%` as never,
    flexBasis:       `${100 / GRID_COLS - (GRID_GAP * (GRID_COLS - 1)) / GRID_COLS}%` as never,
    flex:            1,
    backgroundColor: colors.surface,
    borderRadius:    radius.card,
    padding:         spacing.sm,
    alignItems:      'center',
    minWidth:        90,
  },
  iconCircle: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.xs,
  },
  achievementName: {
    fontFamily: font.semibold,
    fontSize:   10,
    color:      colors.textMuted,
    textAlign:  'center',
  },

  // Saved lessons
  savedList: {
    gap:          spacing.xs,
    marginBottom: spacing.lg,
  },
  savedCard: { gap: 2 },
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

  // Track progress
  trackList: {
    gap:          spacing.md,
    marginBottom: spacing.lg,
  },
  trackItem: { gap: spacing.xs },
  trackRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'baseline',
  },
  trackName: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
  },
  trackPct: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  progressTrack: {
    height:          6,
    backgroundColor: colors.borderSubtle,
    borderRadius:    radius.pill,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: colors.brand,
    borderRadius:    radius.pill,
  },

  // Achievement detail modal
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         spacing.lg,
  },
  modalCard: {
    width:           '100%',
    maxWidth:        360,
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    padding:         spacing.lg,
    alignItems:      'center',
    gap:             spacing.sm,
  },
  modalContent: {
    alignItems: 'center',
    width:      '100%',
  },
  modalIconCircle: {
    width:          64,
    height:         64,
    borderRadius:   32,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.xs,
  },
  modalName: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg,
    color:      colors.textStrong,
    textAlign:  'center',
  },
  modalDescription: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
    textAlign:  'center',
  },
  modalEarnedDate: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  modalXp: {
    fontFamily: font.semibold,
    fontSize:   fontSize.xs,
    color:      '#BE7C1C',
    textAlign:  'center',
  },
  modalCloseBtn: {
    marginTop:    spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
  },
  modalCloseTxt: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.brand,
    textAlign:  'center',
  },

  // Settings (folded in from the Settings tab)
  settingsLabel: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.sm,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  spacing.sm,
    marginTop:     spacing.sm,
  },
  settingsCard: { marginBottom: spacing.sm },
  loadingRow: { alignItems: 'center', paddingVertical: spacing.md },
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
  pushEnabledText: {
    fontFamily:      font.medium,
    fontSize:        fontSize.base,
    color:           colors.success,
    paddingVertical: spacing.xs,
  },
  pushBlockedText: {
    fontFamily:      font.regular,
    fontSize:        fontSize.sm,
    color:           colors.textMuted,
    paddingVertical: spacing.xs,
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

  // Subscription — 073b-8
  manageSubRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: spacing.sm,
  },
  manageSubText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },

  // Misc
  emptyCard: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  logoutBtn: { marginTop: spacing.md },
});
