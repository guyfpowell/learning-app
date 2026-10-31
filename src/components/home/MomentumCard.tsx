import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { xpProgressOf } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Progress } from '@/components/ui/Progress';
import { StreakCalendar } from '@/components/ui/StreakCalendar';
import { CairnLevel } from '@/components/ui/CairnLevel';
import { useXp } from '@/hooks/useXp';
import { useAchievements } from '@/hooks/useAchievements';
import { achievementLineOf, nextStreakCopy, streakStageOf, xpLineOf, type AchievementLine } from '@/lib/momentum';

/** Big enough to read as a badge, but the row stays as tall as its text (see achievementIconSlot). */
const ACHIEVEMENT_ICON_SIZE = fontSize.xl;

/**
 * As large as the longest streak line ("Complete a lesson to start your streak", 38 characters) can be
 * and still fit one line beside the calendar on an iPhone 15 Pro: it measured about 94% of the line at
 * fontSize.sm (14), so about 14.8 is the limit. Half a point over `fontSize.sm`, with a little room to spare.
 */
const STREAK_COPY_SIZE = fontSize.sm + 0.5;

/** Taken off the card's gap between the streak row and the XP block (096). */
const STREAK_TO_XP_TRIM = spacing.xs;

function achievementText(line: AchievementLine): string {
  return line.kind === 'new' ? `New: ${line.name}` : `Next up: ${line.name}`;
}

/** Home's reason to keep going: the streak, XP toward the next level, and one achievement. */
export function MomentumCard({ streak }: { streak: number }) {
  const { data: xp } = useXp();
  const { data: achievements } = useAchievements();
  // One line per stage, picked when the stage is first shown, so a re-render never changes the words.
  const stage = streakStageOf(streak);
  const copy = useMemo(() => nextStreakCopy(stage), [stage]);
  const xpLine = xp ? xpLineOf(xpProgressOf(xp)) : null;
  const achievementLine = achievements ? achievementLineOf(achievements, Date.now()) : null;

  return (
    <View testID="momentum-card" style={styles.card}>
      <View style={styles.streakRow}>
        <StreakCalendar streak={streak} />
        <Text style={styles.streakCopy}>{copy}</Text>
      </View>

      {xp && xpLine && (
        <View testID="momentum-xp" style={styles.xp}>
          <View style={styles.xpHeader}>
            {/* A level shows its name and its step as cairns, not as a numeral ("Foothills I"). */}
            <View style={styles.xpName}>
              <Text style={styles.xpTitle}>{xp.tier ? xp.tier.name : xpLine.title}</Text>
              {xp.tier && <CairnLevel level={xp.tier.level} />}
            </View>
            <Text style={styles.xpTotal}>{`${xp.totalXp.toLocaleString('en-GB')} XP`}</Text>
          </View>
          <Progress testID="momentum-xp-bar" value={xpLine.percent} tone="xp" />
          {!!xpLine.caption && <Text style={styles.xpCaption}>{xpLine.caption}</Text>}
        </View>
      )}

      {achievementLine && (
        <View
          testID="momentum-achievement"
          style={styles.achievement}
        >
          <View testID="momentum-achievement-icon" style={styles.achievementIconSlot}>
            <Ionicons name="ribbon-outline" size={ACHIEVEMENT_ICON_SIZE} color={colors.xp} />
          </View>
          <Text style={styles.achievementText} numberOfLines={2}>{achievementText(achievementLine)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:         { gap: spacing.md, marginBottom: spacing.md, padding: spacing.md, paddingBottom: 0 },
  streakRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: -STREAK_TO_XP_TRIM },
  streakCopy: {
    flex:       1,
    fontFamily: font.medium,
    fontSize:   STREAK_COPY_SIZE,
    color:      colors.textStrong,
    // Nudged 2px down, so it reads level with the calendar.
    transform:  [{ translateY: spacing.xs / 2 }],
  },
  xp:           { gap: spacing.xs },
  xpHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  // The stones' common bottom edge sits on the level name's baseline.
  xpName:       { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  xpTitle: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  xpTotal: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.xp,
  },
  xpCaption: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  achievement: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.sm,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.sm3,
    borderRadius:      radius.md,
    backgroundColor:   colors.xpSoft,
  },
  // The icon's own box is full size, so nothing clips it; the negative margin takes back the extra
  // height, so the row is as tall as the text.
  achievementIconSlot: {
    width:          ACHIEVEMENT_ICON_SIZE,
    height:         ACHIEVEMENT_ICON_SIZE,
    marginVertical: -(ACHIEVEMENT_ICON_SIZE - fontSize.md) / 2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  achievementText: {
    flex:       1,
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
  },
});
