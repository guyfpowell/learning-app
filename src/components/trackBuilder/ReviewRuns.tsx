import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { colors, font, levelCard } from '@/theme';

interface ReviewTopic {
  stableKey: string;
  topicName: string;
  level: string;
}

interface ReviewRun {
  need: string;
  topics: ReviewTopic[];
}

/** A level's colour, whatever the case the server wrote it in; muted for one that is not a level. */
function levelColour(level: string): string {
  const key = level.toLowerCase();
  return key in levelCard ? levelCard[key as keyof typeof levelCard].base : colors.textMuted;
}

/**
 * The path, grouped under the need each run serves, as a list of goals that open to show their topics
 * (board 23). One is open at a time, the first to begin with. A run with no stated need has no heading to
 * fold under, so its topics are simply listed.
 */
export function ReviewRuns({ runs }: { runs: ReviewRun[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View testID="review-runs">
      {runs.map((run, i) => {
        const isOpen = open === i;
        const count = `${run.topics.length} topic${run.topics.length === 1 ? '' : 's'}`;
        return (
          <View key={i} style={styles.run}>
            {run.need ? (
              <Pressable
                testID={`run-toggle-${i}`}
                onPress={() => setOpen(isOpen ? null : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${run.need}, ${count}`}
                style={styles.head}
              >
                <View style={[styles.number, isOpen && styles.numberOpen]}>
                  <Text style={[styles.numberText, isOpen && styles.numberTextOpen]}>{i + 1}</Text>
                </View>
                <View style={styles.headText}>
                  <Text testID={`run-need-${i}`} style={styles.need}>{run.need}</Text>
                  <Text style={styles.count}>{count}</Text>
                  <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                    <Icon name="expand" size={18} color={isOpen ? colors.textStrong : colors.textSubtle} strokeWidth={2.2} />
                  </View>
                </View>
              </Pressable>
            ) : null}
            {(isOpen || !run.need) && (
              <View style={styles.topics}>
                {run.topics.map(t => (
                  <View key={t.stableKey} style={[styles.topic, run.need ? styles.topicIndented : null]}>
                    <Text style={styles.topicName}>{t.topicName}</Text>
                    <View style={styles.level}>
                      <View style={[styles.dot, { backgroundColor: levelColour(t.level) }]} />
                      <Text style={[styles.levelName, { color: levelColour(t.level) }]}>{t.level}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  run:  { borderTopWidth: 1, borderTopColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 15 },
  number:         { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  numberOpen:     { backgroundColor: colors.surfaceInverse },
  numberText:     { fontFamily: font.black, fontSize: 14, color: colors.textStrong },
  numberTextOpen: { color: colors.white },
  headText: { flex: 1, gap: 3 },
  need:     { fontFamily: font.extrabold, fontSize: 16, lineHeight: 16 * 1.3, letterSpacing: -0.01 * 16, color: colors.textStrong },
  count:    { fontFamily: font.semibold, fontSize: 13, color: colors.textMuted },
  chevron:  { paddingTop: 5 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  topics:   { paddingBottom: 6 },
  topic:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  topicIndented: { paddingLeft: 42 },
  topicName: { flex: 1, fontFamily: font.semibold, fontSize: 15, lineHeight: 15 * 1.35, color: colors.textStrong },
  level:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  dot:       { width: 8, height: 8, borderRadius: 3 },
  levelName: { fontFamily: font.bold, fontSize: 12 },
});
