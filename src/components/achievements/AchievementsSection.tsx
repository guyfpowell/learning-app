import { useState } from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { AchievementDefinition, AchievementKey, UserAchievement } from '@learning/shared';
import { ACHIEVEMENTS_BY_KEY } from '@learning/shared';
import { colors, font, press, spacing } from '@/theme';
import { sectionHeadingStyle } from '@/components/ui/sectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { Medal, medalBaseOf, medalInfoOf } from '@/components/ui/Medal';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { useAchievements } from '@/hooks/useAchievements';

type AchievementItem =
  | (UserAchievement & { earned: true })
  | (AchievementDefinition & { earned: false; unlockedAt: undefined });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Achievement detail sheet ──────────────────────────────────────────────────

/** An achievement's detail, as a bottom sheet: its medal, what it is and how it was (or is) earned. */
function AchievementDetailModal({ item, onClose }: { item: AchievementItem; onClose: () => void }) {
  const earned = item.earned;
  const def = ACHIEVEMENTS_BY_KEY[item.key];
  const info = medalInfoOf(item.key);
  const tag = info ? `${info.category} \u00B7 ${info.tier}`.toUpperCase() : null;
  const tagColor = info && earned ? medalBaseOf(info.category) : colors.textMuted;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable testID="achievement-detail-scrim" style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => { /* swallow: keep the sheet open */ }}>
          <View testID="achievement-detail-modal" style={styles.sheetContent}>
            <View style={styles.handle} />
            <View style={styles.sheetMedal}>
              <Medal achievement={item.key} locked={!earned} size={SHEET_MEDAL_SIZE} />
            </View>

            {tag && <Text style={[styles.tag, { color: tagColor }]}>{tag}</Text>}
            <Text testID="achievement-detail-name" style={styles.sheetName}>{item.name}</Text>

            {earned ? (
              <Text testID="achievement-detail-description" style={styles.sheetDescription}>{item.description}</Text>
            ) : (
              <View style={styles.howTo}>
                <Text style={styles.howToLabel}>HOW TO EARN IT</Text>
                <Text testID="achievement-detail-description" style={styles.howToText}>{item.description}</Text>
              </View>
            )}

            {earned && item.unlockedAt ? (
              <Text testID="achievement-detail-earned-date" style={styles.sheetNote}>Earned {formatDate(item.unlockedAt)}</Text>
            ) : (
              !earned && <Text style={styles.sheetNote}>Not earned yet</Text>
            )}

            {def?.xpThreshold && (
              <Text testID="achievement-detail-xp" style={styles.sheetNote}>{def.xpThreshold.toLocaleString()} XP</Text>
            )}

            <View style={styles.close}>
              <EdgeButton
                testID="achievement-detail-close"
                look={{ face: colors.white, label: colors.textStrong, edge: press.secondaryEdge }}
                label="Close"
                onPress={onClose}
              />
            </View>
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

  const earned = all.filter(a => a.earned);
  const toEarn = all.filter(a => !a.earned);
  const total = all.length;
  const earnedCount = achievements?.totalUnlocked ?? earned.length;
  const pct = total > 0 ? (earnedCount / total) * 100 : 0;

  return (
    <View testID="achievements-section" style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.sectionHeading}>Achievements</Text>
        {total > 0 && (
          <View style={styles.progress}>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, pct)}%` }]} />
            </View>
            <Text testID="achievements-count" style={styles.count}>
              {earnedCount} of {total} earned · tap any to see how to earn it
            </Text>
          </View>
        )}
      </View>

      {isLoading && <Spinner />}

      {!isLoading && earned.length > 0 && <MedalGrid label="EARNED" items={earned} onOpen={setSelectedKey} />}
      {!isLoading && toEarn.length > 0 && <MedalGrid label="STILL TO EARN" items={toEarn} onOpen={setSelectedKey} />}

      {selectedKey && selectedItem && (
        <AchievementDetailModal item={selectedItem} onClose={() => setSelectedKey(null)} />
      )}
    </View>
  );
}

/** A labelled grid of medals, four to a row. */
function MedalGrid({ label, items, onOpen }: { label: string; items: AchievementItem[]; onOpen: (key: AchievementKey) => void }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.achievementGrid}>
        {items.map(a => (
          <Pressable key={a.key} testID={`achievement-${a.key}`} onPress={() => onOpen(a.key)} style={styles.achievement}>
            <Medal achievement={a.key} locked={!a.earned} size={MEDAL_SIZE} />
            <Text style={[styles.achievementName, !a.earned && styles.achievementLocked]} numberOfLines={2}>{a.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const GRID_COLS = 4;
const MEDAL_SIZE = 62;
const SHEET_MEDAL_SIZE = 112;

const styles = StyleSheet.create({
  section: { gap: 22 },
  head:    { gap: 10 },
  sectionHeading: sectionHeadingStyle,
  progress: { gap: 7 },
  bar:      { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill:  { height: 6, borderRadius: 3, backgroundColor: colors.textStrong },
  count: {
    fontFamily: font.bold,
    fontSize:   13,
    color:      colors.textBody,
  },
  group: { gap: 14 },
  groupLabel: {
    paddingBottom:     8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontFamily:        font.extrabold,
    fontSize:          12,
    letterSpacing:     0.08 * 12,
    color:             colors.textMuted,
  },

  // Achievements: medals on the page, four to a row
  achievementGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    rowGap:        18,
  },
  achievement: {
    width:             `${100 / GRID_COLS}%`,
    paddingHorizontal: spacing.xs,
    alignItems:        'center',
    gap:               6,
  },
  achievementName: {
    fontFamily: font.bold,
    fontSize:   12,
    lineHeight: 12 * 1.2,
    color:      colors.textStrong,
    textAlign:  'center',
  },
  achievementLocked: { color: colors.textMuted },

  // Achievement detail sheet
  scrim: { flex: 1, backgroundColor: 'rgba(18,21,34,0.48)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor:      colors.paper,
    borderTopLeftRadius:  32,
    borderTopRightRadius: 32,
    paddingTop:           12,
    paddingHorizontal:    28,
    paddingBottom:        44,
  },
  sheetContent: { alignItems: 'center', gap: 14 },
  handle:       { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  sheetMedal:   { paddingTop: 10, paddingBottom: spacing.xs },
  tag:          { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12 },
  sheetName:    { fontFamily: font.black, fontSize: 30, lineHeight: 30, letterSpacing: -0.035 * 30, color: colors.textStrong, textAlign: 'center' },
  sheetDescription: { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.45, color: colors.textBody, textAlign: 'center', maxWidth: 290 },
  howTo: {
    alignSelf:         'stretch',
    gap:               6,
    paddingVertical:   14,
    marginTop:         spacing.xs,
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.border,
  },
  howToLabel: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.08 * 12, color: colors.textMuted },
  howToText:  { fontFamily: font.semibold, fontSize: 17, lineHeight: 17 * 1.4, color: colors.textStrong },
  sheetNote:  { fontFamily: font.bold, fontSize: 13, color: colors.textMuted },
  close:      { alignSelf: 'stretch', marginTop: spacing.sm },
});
