import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, fontSize, spacing } from '@/theme';
import { useTeamSummary, useTeamMemberProgress, useTeamSkillGaps, useTeamLeaderboard } from '@/hooks/useTeam';
import type { SkillGap } from '@learning/shared';

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <View style={styles.pbTrack}>
      <View style={[styles.pbFill, { width: `${clamped}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

function gapColor(avgScore: number): string {
  if (avgScore < 60) return colors.error;
  if (avgScore < 80) return '#F59E0B';
  return colors.teal;
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
        <ActivityIndicator testID="loading-spinner" size="large" color={colors.teal} />
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Failed to load team data</Text>
      </SafeAreaView>
    );
  }

  const summary    = summaryQ.data;
  const members    = membersQ.data ?? [];
  const skillGaps  = gapsQ.data ?? [];
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
                <Text style={styles.memberScore}>{Math.round(m.avgScore)}%</Text>
              </View>
              {m.currentSkill && (
                <Text style={styles.memberSkill}>{m.currentSkill}</Text>
              )}
              <View style={styles.memberMeta}>
                <Text style={styles.metaText}>🔥 {m.streak}</Text>
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
              <Text style={styles.leaderRank}>#{idx + 1}</Text>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName}>{entry.name}</Text>
                <Text style={styles.metaText}>{entry.lessonsCompleted} lessons · 🔥 {entry.streak}</Text>
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
                <Text style={styles.gapScore}>{Math.round(gap.avgScore)}%</Text>
              </View>
              <ProgressBar pct={gap.avgScore} color={gapColor(gap.avgScore)} />
              <Text style={styles.gapSample}>{gap.sampleSize} responses</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:    { padding: spacing.md, paddingBottom: 40 },

  heading:    { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.textDark, marginBottom: spacing.xs },
  subheading: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.textDark },
  statLabel: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

  sectionTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.textDark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },

  memberCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textDark },
  memberScore:{ fontFamily: font.bold, fontSize: fontSize.sm, color: colors.teal },
  memberSkill:{ fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  memberMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  metaText:   { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaderRank: { fontFamily: font.bold, fontSize: fontSize.base, color: colors.teal, width: 32 },
  leaderInfo: { flex: 1 },
  leaderName: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textDark },

  gapCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  gapName:   { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textDark, flex: 1 },
  gapScore:  { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textDark },
  gapSample: { fontFamily: font.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },

  pbTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  pbFill:  { height: '100%', borderRadius: 4 },

  errorText: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
