import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Quiz } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { QuizOpt, type QuizOptState } from '@/components/ui/QuizOpt';
import { PinnedAction, PINNED_ACTION_CLEARANCE } from '@/components/ui/PinnedAction';
import { CIRCLE_BUTTON_SIZE } from '@/components/ui/circleButtonStyle';
import { QuizHeroCard } from '@/components/quiz/QuizHeroCard';
import { quizFrameStyles, frameContentStyle } from '@/components/quiz/QuizResultFrame';
import { colors, font, fontSize, press, spacing } from '@/theme';

/** Extra room under the last answer, so a picked one (cobalt) does not sit tight against the cobalt Submit at the end of the scroll. */
const QUESTION_BOTTOM_AIR = spacing.md;

interface QuizQuestionViewProps {
  quizzes: Quiz[];
  currentQuizIndex: number;
  selectedAnswer: string | undefined;
  /** The answer ruled out by a wrong first try; set only on the second try. */
  wrongAnswer: string | undefined;
  /** The submit's error, shown under the answer, or null while there is none. */
  submitError: string | null;
  submitting: boolean;
  onToggleOption: (option: string) => void;
  onChangeAnswer: (answer: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function optionState(option: string, selectedAnswer: string | undefined, wrongAnswer: string | undefined): QuizOptState {
  if (wrongAnswer === option) return 'ruledOut';
  return selectedAnswer === option ? 'selected' : 'idle';
}

/** A multiple-choice question's answers. */
function QuizOptions({ options, selectedAnswer, wrongAnswer, onToggle }: {
  options: string[];
  selectedAnswer: string | undefined;
  wrongAnswer: string | undefined;
  onToggle: (option: string) => void;
}) {
  // On the second try the ruled-out answer drops to the bottom. Its testID keeps its original place.
  // Once one is picked it is the only one shown; picking it again brings the rest back.
  const ordered = options.filter(option => option !== wrongAnswer).concat(options.filter(option => option === wrongAnswer));
  const shown = selectedAnswer === undefined ? ordered : ordered.filter(option => option === selectedAnswer);
  return (
    <View style={[styles.options, selectedAnswer !== undefined && styles.optionsPicked]}>
      {shown.map(option => (
        <QuizOpt
          key={option}
          testID={`quiz-opt-${options.indexOf(option)}`}
          label={option}
          state={optionState(option, selectedAnswer, wrongAnswer)}
          onPress={() => onToggle(option)}
        />
      ))}
    </View>
  );
}

/** The question being asked, its answers, and Submit pinned over them. */
export function QuizQuestionView({
  quizzes, currentQuizIndex, selectedAnswer, wrongAnswer, submitError, submitting, onToggleOption, onChangeAnswer, onSubmit, onClose,
}: QuizQuestionViewProps) {
  const insets = useSafeAreaInsets();
  const current = quizzes[currentQuizIndex];
  const pickedChoice = current?.type === 'multiple-choice' && selectedAnswer !== undefined;

  return (
    <View style={styles.container}>
      {/* The question view has no bookmark: the spacer keeps the close button right-aligned. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View style={styles.spacer} />
          <View style={styles.headerCentre} pointerEvents="none">
            <Text style={styles.headerTitle}>Test my knowledge</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close quiz">
            <Ionicons name="close" size={22} color={colors.textStrong} />
          </Pressable>
        </View>
      </View>

      <ScrollView testID="quiz-question-content" contentContainerStyle={[...frameContentStyle(insets.bottom), current && { paddingBottom: PINNED_ACTION_CLEARANCE + QUESTION_BOTTOM_AIR + insets.bottom }, pickedChoice && styles.contentGrow]}>
        {!current ? (
          <Text style={styles.empty}>No quiz available for this lesson.</Text>
        ) : (
          <>
            {wrongAnswer !== undefined && current.type === 'multiple-choice' && (
              <View testID="second-try-note" style={styles.secondTry}>
                <Icon name="retake" size={fontSize.md} color={colors.altitudeText} />
                <Text style={styles.secondTryText}>Retry</Text>
              </View>
            )}
            <QuizHeroCard
              question={current.question}
              progress={quizzes.length > 1 ? { index: currentQuizIndex, total: quizzes.length } : undefined}
            />

            {current.type === 'multiple-choice' ? (
              <QuizOptions options={current.options} selectedAnswer={selectedAnswer} wrongAnswer={wrongAnswer} onToggle={onToggleOption} />
            ) : (
              <Input
                placeholder="Your answer..."
                value={selectedAnswer ?? ''}
                onChangeText={onChangeAnswer}
                style={styles.shortAnswerInput}
              />
            )}

            {submitError !== null && (
              <Text testID="submit-error" style={styles.error}>{submitError}</Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Submit floats over the question, which scrolls behind it. A multiple-choice question shows it only once an answer is picked; a typed answer keeps it, grey until something is typed. */}
      {current && (current.type !== 'multiple-choice' || !!selectedAnswer) && (
        <PinnedAction>
          <EdgeButton
            testID="submit-btn"
            look={{ face: colors.brand, label: colors.white, edge: press.primaryEdge }}
            disabledLook={{ face: colors.border, label: colors.textSubtle }}
            label="Submit"
            onPress={onSubmit}
            loading={submitting}
            disabled={!selectedAnswer}
          />
        </PinnedAction>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ...quizFrameStyles,
  spacer:    { width: 32 },
  headerTitle: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textMuted },
  // Over the plain page the close button is a bare cross, not a box.
  closeBtn: { width: CIRCLE_BUTTON_SIZE, height: CIRCLE_BUTTON_SIZE, alignItems: 'center', justifyContent: 'center' },
  secondTry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  secondTryText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.altitudeText },
  contentGrow: { flexGrow: 1 },
  options:  { gap: spacing.sm3, marginBottom: spacing.lg },
  // The one picked answer sits midway between the question and Submit.
  optionsPicked: { flex: 1, justifyContent: 'center', marginBottom: 0 },
  shortAnswerInput:   { marginBottom: spacing.lg },
  error: {
    fontFamily:   font.regular,
    fontSize:     fontSize.sm,
    color:        colors.error,
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    marginTop:  spacing.xl,
  },
});
