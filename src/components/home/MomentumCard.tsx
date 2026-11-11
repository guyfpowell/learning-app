import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { xpProgressOf } from '@learning/shared';
import { colors, font, fontSize, spacing, trackingEm } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { Medal } from '@/components/ui/Medal';
import { Progress } from '@/components/ui/Progress';
import { SubLevel } from '@/components/ui/SubLevel';
import { useXp } from '@/hooks/useXp';
import { useAchievements } from '@/hooks/useAchievements';
import { achievementLineOf, xpLineOf, type AchievementLine } from '@/lib/momentum';

/** Home's one line of encouragement, in place of a streak message. */
const MOTTO = 'Small steps, real progress.';

const XP_BAR_HEIGHT = 12;
const MEDAL_SIZE = 26;
const FLAME_SIZE = 20;

function achievementText(line: AchievementLine): string {
  return line.kind === 'new' ? `New: ${line.name}` : `Next up: ${line.name}`;
}

/** Home's top: the motto and the streak, then the level, its XP and one achievement. */
export function MomentumCard({ streak }: { streak: number }) {
  const { data: xp } = useXp();
  const { data: achievements } = useAchievements();
  const xpLine = xp ? xpLineOf(xpProgressOf(xp)) : null;
  const achievementLine = achievements ? achievementLineOf(achievements, Date.now()) : null;

  return (
    <View testID="momentum-card" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.motto}>{MOTTO}</Text>
        <View testID="streak-chip" style={styles.streak} accessibilityLabel={`${streak} day streak`}>
          <Icon name="streak" size={FLAME_SIZE} color={colors.coral} fill={colors.coral} />
          <Text style={styles.streakCount}>{streak}</Text>
        </View>
      </View>

      {xp && xpLine && (
        <View testID="momentum-xp" style={styles.xp}>
          <View style={styles.xpHeader}>
            {/* A level shows its name and, beside it, its step as a trail ("Foothills" and the second stop). */}
            <View style={styles.xpName}>
              <Text style={styles.xpTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {xp.tier ? xp.tier.name : xpLine.title}
              </Text>
              {xp.tier && <SubLevel level={xp.tier.level} />}
            </View>
            <Text style={styles.xpTotal}>
              {xp.totalXp.toLocaleString('en-GB')}
              <Text style={styles.xpUnit}> XP</Text>
            </Text>
          </View>
          <Progress testID="momentum-xp-bar" value={xpLine.percent} tone="xp" height={XP_BAR_HEIGHT} trackColor={colors.xpTrack} />
          <View style={styles.caption}>
            <Text style={styles.xpCaption}>{xpLine.caption}</Text>
            {achievementLine && (
              <View testID="momentum-achievement" style={styles.achievement}>
                <View testID="momentum-achievement-icon">
                  <Medal achievement={achievementLine.key} locked={achievementLine.kind === 'next'} size={MEDAL_SIZE} />
                </View>
                <Text style={styles.achievementText} numberOfLines={1}>{achievementText(achievementLine)}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { gap: spacing.md, marginBottom: spacing.md },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  motto:       { flex: 1, fontFamily: font.bold, fontSize: fontSize.md, color: colors.textMuted },
  streak:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  streakCount: { fontFamily: font.extrabold, fontSize: fontSize.md, color: colors.textStrong },
  xp:          { gap: spacing.sm },
  xpHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  xpName:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xpTitle: {
    flexShrink:    1,
    fontFamily:    font.display,
    fontSize:      fontSize.xxl,
    letterSpacing: trackingEm.display * fontSize.xxl,
    color:         colors.textStrong,
  },
  xpTotal:     { fontFamily: font.black, fontSize: fontSize.xl + 4, letterSpacing: trackingEm.title * (fontSize.xl + 4), color: colors.xpDark },
  xpUnit:      { fontFamily: font.extrabold, fontSize: fontSize.sm, letterSpacing: 0, color: colors.xpDark },
  caption:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  xpCaption:   { flexShrink: 1, fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  achievementText: { flexShrink: 1, fontFamily: font.extrabold, fontSize: fontSize.sm, color: colors.brand },
});
