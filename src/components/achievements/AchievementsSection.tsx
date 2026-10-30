import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AchievementAxis, AchievementDefinition, AchievementKey, UserAchievement } from '@learning/shared';
import { ACHIEVEMENTS_BY_KEY } from '@learning/shared';
import { colors, font, fontSize, radius, spacing, shadow } from '@/theme';
import { Spinner } from '@/components/ui/Spinner';
import { useAchievements } from '@/hooks/useAchievements';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Achievement detail modal ──────────────────────────────────────────────────

function AchievementDetailModal({ item, onClose }: { item: AchievementItem; onClose: () => void }) {
  const iconName = AXIS_ICON[item.axis] ?? 'star-outline';
  const earned = item.earned;
  const def = ACHIEVEMENTS_BY_KEY[item.key];

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

/** Every achievement, earned ones lit and locked ones dim, with how many are earned. Moved from Profile (096). */
export function AchievementsSection() {
  const { data: achievements, isLoading } = useAchievements();
  const [selectedKey, setSelectedKey] = useState<AchievementKey | null>(null);

  const all: AchievementItem[] = [
    ...(achievements?.unlocked.map(a => ({ ...a, earned: true as const })) ?? []),
    ...(achievements?.locked.map(a => ({ ...a, earned: false as const, unlockedAt: undefined })) ?? []),
  ];
  const selectedItem = selectedKey ? (all.find(a => a.key === selectedKey) ?? null) : null;

  return (
    <View testID="achievements-section">
      <View style={styles.headingRow}>
        <Text style={styles.sectionHeading}>Achievements</Text>
        {all.length > 0 && (
          <Text testID="achievements-count" style={styles.count}>
            {achievements?.totalUnlocked ?? 0} of {all.length}
          </Text>
        )}
      </View>

      {isLoading && <Spinner />}

      {!isLoading && all.length > 0 && (
        <View style={styles.achievementGrid}>
          {all.map(a => {
            const iconName = AXIS_ICON[a.axis] ?? 'star-outline';
            const earned = a.earned;
            return (
              <Pressable
                key={a.key}
                testID={`achievement-${a.key}`}
                onPress={() => setSelectedKey(a.key)}
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

      {selectedKey && selectedItem && (
        <AchievementDetailModal item={selectedItem} onClose={() => setSelectedKey(null)} />
      )}
    </View>
  );
}

const GRID_GAP = 10;
const GRID_COLS = 3;

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionHeading: {
    fontFamily:    font.semibold,
    fontSize:      fontSize.sm,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop:     spacing.lg,
    marginBottom:  spacing.sm,
  },
  count: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },

  // Achievements
  achievementGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            GRID_GAP,
    marginBottom:   spacing.lg,
  },
  achievementCard: {
    flexBasis:       `${100 / GRID_COLS - (GRID_GAP * (GRID_COLS - 1)) / GRID_COLS}%`,
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
});
