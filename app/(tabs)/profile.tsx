import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AchievementAxis, TrackEnrollmentWithProgress } from '@learning/shared';
import { colors, font, fontSize, radius, spacing, shadow } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { useProgress } from '@/hooks/useProgress';
import { useEnrollments } from '@/hooks/useTrack';
import { useSavedLessons } from '@/hooks/useLesson';
import { useAchievements } from '@/hooks/useAchievements';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function flooredPct(enrollment: TrackEnrollmentWithProgress): number {
  return enrollment.completedLessons > 0
    ? Math.max(1, Math.round(enrollment.percentComplete))
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

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const { data: progress } = useProgress();
  const { data: enrollmentsData } = useEnrollments();
  const { data: savedData } = useSavedLessons();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();

  const activeEnrollments = enrollmentsData?.filter(e => e.percentComplete < 100) ?? [];
  const savedLessons = savedData ?? [];
  const totalUnlocked = achievements?.totalUnlocked ?? 0;

  const allAchievements = [
    ...(achievements?.unlocked.map(a => ({ ...a, earned: true })) ?? []),
    ...(achievements?.locked.map(a => ({ ...a, earned: false, unlockedAt: undefined })) ?? []),
  ];

  return (
    <SafeAreaView style={styles.container}>
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
            <Text testID="profile-badge-count" style={styles.statValue}>
              {totalUnlocked}
            </Text>
            <Text style={styles.statLabel}>badges</Text>
          </Card>
        </View>

        {/* ── Achievements grid ─────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Achievements</Text>

        {achievementsLoading && <Spinner />}

        {!achievementsLoading && allAchievements.length > 0 && (
          <View style={styles.achievementGrid}>
            {allAchievements.map(a => {
              const iconName = AXIS_ICON[a.axis] ?? 'star-outline';
              const earned = (a as { earned: boolean }).earned;
              return (
                <View
                  key={a.key}
                  testID={`achievement-${a.key}`}
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
                </View>
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

        {activeEnrollments.length === 0 ? (
          <Card testID="profile-no-tracks" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tracks enrolled yet.</Text>
          </Card>
        ) : (
          <View style={styles.trackList}>
            {activeEnrollments.map(e => {
              const pct = flooredPct(e);
              return (
                <View key={e.id} style={styles.trackItem}>
                  <View style={styles.trackRow}>
                    <Text style={styles.trackName}>{e.skill.name}</Text>
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

        {/* ── Log out ───────────────────────────────────────────────────────── */}
        <Button
          label="Log Out"
          variant="outline"
          style={styles.logoutBtn}
          loading={logout.isPending}
          onPress={() => logout.mutate()}
        />

      </ScrollView>
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
