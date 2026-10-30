import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { xpProgressOf } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { StreakFlame } from '@/components/quiz/QuizResultParts';
import { useXp } from '@/hooks/useXp';
import { useAchievements } from '@/hooks/useAchievements';
import { achievementLineOf, streakCopy, xpLineOf, type AchievementLine } from '@/lib/momentum';

/** Big enough to read as a badge, but the row stays as tall as its text (see achievementIconSlot). */
const ACHIEVEMENT_ICON_SIZE = fontSize.xl;
/** The streak flame is bigger here than in the quiz header: it is the card's lead. */
const STREAK_FLAME_SIZE = 64;

function achievementText(line: AchievementLine): string {
  return line.kind === 'new' ? `New: ${line.name}` : `Next up: ${line.name} · ${line.description}`;
}

/** Home's reason to keep going: the streak, XP toward the next level, and one achievement. */
export function MomentumCard({ streak }: { streak: number }) {
  const { data: xp } = useXp();
  const { data: achievements } = useAchievements();
  const xpLine = xp ? xpLineOf(xpProgressOf(xp)) : null;
  const achievementLine = achievements ? achievementLineOf(achievements, Date.now()) : null;

  return (
    <Card testID="momentum-card" style={styles.card}>
      <View style={styles.streakRow}>
        <StreakFlame streak={streak} solid size={STREAK_FLAME_SIZE} />
        <Text style={styles.streakCopy}>{streakCopy(streak)}</Text>
      </View>

      {xp && xpLine && (
        <View testID="momentum-xp" style={styles.xp}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpTitle}>{xpLine.title}</Text>
            <Text style={styles.xpTotal}>{`${xp.totalXp.toLocaleString('en-GB')} XP`}</Text>
          </View>
          <Progress testID="momentum-xp-bar" value={xpLine.percent} tone="xp" />
          {!!xpLine.caption && <Text style={styles.xpCaption}>{xpLine.caption}</Text>}
        </View>
      )}

      {achievementLine && (
        <View
          testID="momentum-achievement"
          style={[styles.achievement, achievementLine.kind === 'new' && styles.achievementNew]}
        >
          <View testID="momentum-achievement-icon" style={styles.achievementIconSlot}>
            <Ionicons name="ribbon-outline" size={ACHIEVEMENT_ICON_SIZE} color={colors.xp} />
          </View>
          <Text style={styles.achievementText} numberOfLines={2}>{achievementText(achievementLine)}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:         { gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  streakRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streakCopy: {
    flex:       1,
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
  },
  xp:           { gap: spacing.xs },
  xpHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
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
  achievementNew: { backgroundColor: colors.xpSoft },
  achievementText: {
    flex:       1,
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
  },
});
