import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  WEEK_DONE,
  levelsGainedCopy,
  metresClimbedCopy,
  weekLessonsCopy,
  weekSectionsOf,
  type WeekRowSheet,
  type WeekSummaryResponse,
} from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { EdgeButton, SECONDARY_EDGE_LOOK } from '@/components/ui/EdgeButton';
import { MedalSheet } from '@/components/achievements/MedalSheet';
import { LandmarkSheetModal } from '@/components/altitudeChart/LandmarkSheetModal';
import { WeekRowView } from './WeekRowView';
import { colors, font, spacing } from '@/theme';

/** The sheet a tapped row opens, as the row built it: a landmark's sheet, or the medal sheet. */
function WeekSheet({ sheet, onClose }: { sheet: WeekRowSheet; onClose: () => void }) {
  if (sheet.kind === 'landmark') return <LandmarkSheetModal landmarkKey={sheet.landmarkKey} sheet={sheet.sheet} onClose={onClose} />;
  return <MedalSheet item={sheet.item} celebrating={false} onClose={onClose} />;
}

/** The week, quietly (brief item 7, design E1): the metres climbed as the one gold number, the levels and lessons, then each section's rows. */
export function WeekSummaryView({ week, timezone, onDone }: { week: WeekSummaryResponse; timezone: string | undefined; onDone: () => void }) {
  const [opened, setOpened] = useState<WeekRowSheet | null>(null);

  return (
    <ScrollView testID="week-scroll" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text testID="week-metres" style={styles.metres}>{metresClimbedCopy(week.metresClimbed)}</Text>
        <Text testID="week-levels" style={styles.levels}>{levelsGainedCopy(week.levelAtStart, week.levelNow)}</Text>
        <Text testID="week-lessons" style={styles.lessons}>{weekLessonsCopy(week.lessonsCompleted, week.metresNow)}</Text>
      </View>

      {weekSectionsOf(week.unlocked, timezone).map((section) => (
        <View key={section.key} testID={`week-section-${section.key}`}>
          <Text style={styles.heading}>{section.heading}</Text>
          {section.rows.map((row) => <WeekRowView key={row.key} row={row} onOpen={setOpened} />)}
        </View>
      ))}

      <View style={styles.done}>
        <EdgeButton testID="week-done" look={SECONDARY_EDGE_LOOK} label={WEEK_DONE} onPress={onDone} />
      </View>

      {opened && <WeekSheet sheet={opened} onClose={() => setOpened(null)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  header:  { gap: 6 },
  metres:  { fontFamily: font.black, fontSize: 64, lineHeight: 64, letterSpacing: -0.05 * 64, color: colors.altitudeDark },
  levels:  { fontFamily: font.extrabold, fontSize: 22, letterSpacing: -0.02 * 22, color: colors.textStrong },
  lessons: { fontFamily: font.regular, fontSize: 15, color: colors.textMuted },
  heading: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.08 * 12, color: colors.textMuted, paddingTop: spacing.sm, paddingBottom: 4 },
  done:    { marginTop: spacing.md },
});
