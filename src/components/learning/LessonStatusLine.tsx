import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { StatusBox, type StepStatus } from '@/components/learning/TrackSteps';
import { colors, font } from '@/theme';

const SIZE = 20;

/** "Lesson 1 of 8 · Completed", with the lesson's status box in the level's colour. */
export function LessonStatusLine({ status, color, text, testID }: { status: StepStatus; color: string; text: string; testID?: string }) {
  const done = status === 'done';
  return (
    <View style={styles.line}>
      <StatusBox status={status} color={color} size={SIZE} />
      <Text testID={testID} style={[styles.text, { color: done ? color : colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: font.bold, fontSize: 13 },
});
