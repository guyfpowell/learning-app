import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Spinner } from '@/components/ui/Spinner';
import { Progress } from '@/components/ui/Progress';
import { FlameIcon } from '@/components/ui/Streak';
import { useTeamSummary, useTeamMemberProgress, useTeamSkillGaps, useTeamLeaderboard } from '@/hooks/useTeam';
import { extractError } from '@/lib/errors';
import type { SkillGap } from '@learning/shared';

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#B45309'] as const;

export function rankColor(idx: number): string {
  return idx < 3 ? MEDAL_COLORS[idx] : colors.textMuted;
}

export function gapColor(avgScore: number): string {
  if (avgScore < 50) return colors.error;
  if (avgScore < 70) return '#F59E0B';
  return colors.brand;
}

function gapTone(avgScore: number): 'coral' | 'success' | 'brand' {
  if (avgScore < 70) return 'coral';
  return 'success';
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function TeamScreen() {
  const summaryQ  = useTeamSummary();
  const membersQ  = useTeamMemberProgress();
  const gapsQ     = useTeamSkillGaps();
  const leaderQ   = useTeamLeaderboard();

  const isLoading = summaryQ.isLoading || membersQ.isLoading || gapsQ.isLoading || leaderQ.isLoading;
  const hasError  = summaryQ.error || membersQ.error || gapsQ.error || leaderQ.error;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Spinner testID="loading-spinner" fullScreen />
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text testID="team-error" style={styles.errorText}>
          {extractError(summaryQ.error ?? membersQ.error ?? gapsQ.error ?? leaderQ.error)}
        </Text>
      </SafeAreaView>
    );
  }

  const summary     = summaryQ.data;
  const members     = membersQ.data ?? [];
  const skillGaps   = gapsQ.data ?? [];
  const leaderboard = leaderQ.data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Team Dashboard</Text>
        <Text style={styles.subheading}>Track your team's learning progress</Text>

        {summary && (
          <View style={styles.statsGrid}>
            <StatCard label="Members"           value={summary.memberCount} />
            <StatCard label="Total Completions" value={summary.totalCompletions} />
            <StatCard label="Avg Quiz Score"    value={`${Math.round(summary.avgQuizScore)}%`} />
            <StatCard label="Avg Streak"        value={`${Math.round(summary.avgStreak)}d`} />
          </View>
        )}

        <Text style={styles.sectionTitle}>Member Progress</Text>
        {members.length === 0 ? (
          <Text style={styles.emptyText}>No member progress yet.</Text>
        ) : (
          members.map((m) => (
            <View key={m.userId} style={styles.memberCard}>
              <View style={styles.memberRow}>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={[styles.memberScore, { color: gapColor(m.avgScore) }]}>
                  {Math.round(m.avgScore)}%
                </Text>
              </View>
              {m.currentSkill && (
                <Text style={styles.memberSkill}>{m.currentSkill}</Text>
              )}
              <View style={styles.memberMeta}>
                <View style={styles.streakMeta}>
                  <FlameIcon size={12} />
                  <Text
                    testID={`streak-count-${m.userId}`}
                    style={styles.metaText}
                  >
                    {' '}{m.streak}
                  </Text>
                </View>
                <Text style={styles.metaText}>{m.lessonsCompleted} lessons</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {leaderboard.length === 0 ? (
          <Text style={styles.emptyText}>No leaderboard data yet.</Text>
        ) : (
          leaderboard.map((entry, idx) => (
            <View key={entry.userId} style={styles.leaderRow}>
              <Text
                testID={`rank-badge-${idx + 1}`}
                style={[styles.leaderRank, { color: rankColor(idx) }]}
              >
                #{idx + 1}
              </Text>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName}>{entry.name}</Text>
                <View style={styles.leaderMeta}>
                  <Text style={styles.metaText}>{entry.lessonsCompleted} lessons · </Text>
                  <FlameIcon size={12} />
                  <Text style={styles.metaText}> {entry.streak}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Skill Gaps</Text>
        {skillGaps.length === 0 ? (
          <Text style={styles.emptyText}>No skill gap data yet.</Text>
        ) : (
          skillGaps.map((gap: SkillGap) => (
            <View key={gap.skillName} style={styles.gapCard}>
              <View style={styles.gapHeader}>
                <Text style={styles.gapName}>{gap.skillName}</Text>
                <Text style={[styles.gapScore, { color: gapColor(gap.avgScore) }]}>
                  {Math.round(gap.avgScore)}%
                </Text>
              </View>
              <Progress value={gap.avgScore} tone={gapTone(gap.avgScore)} />
              <Text style={styles.gapSample}>{gap.sampleSize} responses</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:    { padding: spacing.md, paddingBottom: 40 },

  heading:    { fontFamily: font.semibold, fontSize: fontSize.xl, color: colors.textStrong, marginBottom: spacing.xs },
  subheading: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: { fontFamily: font.semibold, fontSize: fontSize.xl, color: colors.textStrong },
  statLabel: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

  sectionTitle: {
    fontFamily: font.semibold,
    fontSize: fontSize.base,
    color: colors.textStrong,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },

  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  memberRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong },
  memberScore:{ fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.brand },
  memberSkill:{ fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  memberMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  streakMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText:   { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  leaderRank: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand, width: 32 },
  leaderInfo: { flex: 1 },
  leaderName: { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong },
  leaderMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },

  gapCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  gapName:   { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong, flex: 1 },
  gapScore:  { fontFamily: font.semibold, fontSize: fontSize.sm, color: colors.textStrong },
  gapSample: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },

  errorText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
