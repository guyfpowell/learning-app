import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { ALBERT_STEPS } from '@learning/shared';
import { colors, font, fontSize, press, spacing } from '@/theme';
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

/** Albert's four steps as a stepper that shows how far along the person is. */
export function AlbertSteps({ statuses }: { statuses: AlbertStepStatus[] }) {
  return (
    <View testID="albert-steps" style={styles.steps}>
      {ALBERT_STEPS.map((step, i) => {
        const status = statuses[i];
        return (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View style={styles.dotBox}>
                {status === 'current' && <View style={styles.dotEdge} />}
                <View testID={`albert-step-${i + 1}-${status}`} style={[styles.stepDot, status === 'current' && styles.stepDotCurrent, status === 'done' && styles.stepDotDone]}>
                  {status === 'done' ? (
                    <Icon name="check" size={fontSize.sm} color={colors.brand} strokeWidth={3} />
                  ) : (
                    <Text style={[styles.stepNum, status === 'current' && styles.stepNumCurrent]}>{i + 1}</Text>
                  )}
                </View>
              </View>
              {i < ALBERT_STEPS.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepTitle, status === 'todo' && styles.stepTitleTodo]}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 30;
const DOT_RADIUS = 10;
const DOT_EDGE = 3;

const styles = StyleSheet.create({
  steps:    {},
  stepRow:  { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center', width: DOT },
  dotBox:   { width: DOT, height: DOT },
  // The current step's solid edge: a copy of the dot, 3pt lower, in the darker cobalt.
  dotEdge: {
    position:        'absolute',
    top:             DOT_EDGE,
    width:           DOT,
    height:          DOT,
    borderRadius:    DOT_RADIUS,
    backgroundColor: press.onCobaltEdge,
  },
  stepDot: {
    width:           DOT,
    height:          DOT,
    borderRadius:    DOT_RADIUS,
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
    fontFamily: font.black,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  stepNumCurrent: { color: colors.onBrand },
  stepLine: {
    flex:            1,
    width:           2,
    minHeight:       8,
    backgroundColor: colors.border,
    marginVertical:  spacing.xs,
  },
  stepText:  { flex: 1, gap: 2, paddingTop: 3, paddingBottom: spacing.sm },
  stepTitle: {
    fontFamily:    font.extrabold,
    fontSize:      fontSize.base,
    letterSpacing: -0.01 * fontSize.base,
    color:         colors.textStrong,
  },
  stepTitleTodo: { color: colors.textBody },
  stepBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
    color:      colors.textMuted,
  },
});
