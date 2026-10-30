import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALBERT_STEPS } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import type { BuildCardState } from '@/components/albert/BuildPathCard';

export type AlbertStepStatus = 'done' | 'current' | 'todo';

/**
 * Where the person is in Albert's four steps (096): none yet, so step 1; a path in progress, so
 * steps 1 and 2 are done and they are learning it (step 3), or step 4 while a suggestion waits; a
 * finished path, so all four are done.
 */
export function albertStepStatuses(state: BuildCardState, hasProposal: boolean): AlbertStepStatus[] {
  if (state === 'complete') return ['done', 'done', 'done', 'done'];
  if (state === 'unfinished') {
    return hasProposal ? ['done', 'done', 'done', 'current'] : ['done', 'done', 'current', 'todo'];
  }
  return ['current', 'todo', 'todo', 'todo'];
}

/** Albert's four steps as a list that shows how far along the person is. */
export function AlbertSteps({ statuses }: { statuses: AlbertStepStatus[] }) {
  return (
    <View testID="albert-steps" style={styles.steps}>
      {ALBERT_STEPS.map((step, i) => {
        const status = statuses[i];
        return (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View testID={`albert-step-${i + 1}-${status}`} style={[styles.stepDot, status === 'current' && styles.stepDotCurrent, status === 'done' && styles.stepDotDone]}>
                {status === 'done' ? (
                  <Ionicons name="checkmark" size={fontSize.sm} color={colors.brand} />
                ) : (
                  <Text style={[styles.stepNum, status === 'current' && styles.stepNumCurrent]}>{i + 1}</Text>
                )}
              </View>
              {i < ALBERT_STEPS.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 28;

const styles = StyleSheet.create({
  steps:    { marginBottom: spacing.lg },
  stepRow:  { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: DOT },
  stepDot: {
    width:           DOT,
    height:          DOT,
    borderRadius:    DOT / 2,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
  },
  stepDotCurrent: { backgroundColor: colors.brand, borderColor: colors.brand },
  // Done: a tick in cobalt on the soft cobalt fill.
  stepDotDone:    { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  stepNum: {
    fontFamily: font.semibold,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  stepNumCurrent: { color: colors.onBrand },
  stepLine: {
    flex:            1,
    width:           2,
    minHeight:       spacing.lg,
    backgroundColor: colors.borderSubtle,
    marginVertical:  2,
  },
  stepText:  { flex: 1, paddingBottom: spacing.md },
  stepTitle: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  stepBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    marginTop:  2,
  },
});
