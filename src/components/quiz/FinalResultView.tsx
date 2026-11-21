import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lesson, QuizResult, Rewards } from '@learning/shared';
import { metresChipOf } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { TopicFeedback } from '@/components/ui/TopicFeedback';
import { LessonRatingControl } from '@/components/ui/LessonRatingControl';
import { MetresChipOverlay, type ScreenRect } from '@/components/ui/CelebrationOverlay';
import { Reveal, revealDelay } from '@/components/ui/Reveal';
import { QuizFeedbackCard } from '@/components/quiz/QuizFeedbackCard';
import { QuizResultFrame, headerRowBox } from '@/components/quiz/QuizResultFrame';
import { ResultButton } from '@/components/quiz/ResultButton';
import { ResultHeading, useResultHeadline, type ResultHeadline } from '@/components/quiz/ResultHeading';
import { MilestoneCard, TrackAccuracyBadge, MetresAward } from '@/components/quiz/QuizResultParts';
import { nextLessonLabel } from '@/components/quiz/nextLessonLabel';
import { verdictTone, type ResultTone } from '@/components/quiz/resultTone';
import { useRefreshPaths, useTopicFeedback } from '@/hooks/useTrack';
import { enqueueRewards } from '@/lib/rewards';
import { useCelebrationQueueStore } from '@/store/celebrationQueue.store';
import { colors, font, radius, results, spacing } from '@/theme';

/** The milestone card grows in from this scale when the lesson is finalised. */
const MILESTONE_START_SCALE = 0.8;

/** How the track accuracy and the milestone card spring into place. */
const SPRING_IN: Animated.SpringAnimationConfig = { toValue: 1, friction: 5, tension: 80, useNativeDriver: true };

interface FinalResultViewProps {
  /** The finished result on show: the matching ending's at once, then the server's reply in its place. None when no ending was loaded, until the reply arrives. */
  result: QuizResult | undefined;
  /** This answer's correctness, which tones the view. */
  correct: boolean;
  lessonId: string;
  /** The lesson's rating as the screen has it, for the control until the reply carries the stored one. */
  lessonRating: Lesson['rating'];
  saved: boolean;
  onToggleSave: () => void;
  /** ✕: leave the lesson for where it was opened from. */
  onLeave: () => void;
  /** The way on: the next lesson, or Home with none. */
  onNavigate: (nextLessonId: string | null | undefined) => void;
}

/**
 * The finished view. With a result (the matching ending's, ADR-027) the whole page shows at once, and
 * the server's reply then arrives as the same prop and updates the one body in place: it is never
 * remounted. With none (the endings were not loaded) the heading shows and the body mounts when the
 * reply arrives. The headline is held here, so the heading keeps its words and doesn't burst again.
 */
export function FinalResultView({ result, correct, lessonRating, ...rest }: FinalResultViewProps) {
  const { lessonId, saved, onToggleSave, onLeave } = rest;
  const headline = useResultHeadline(verdictTone(correct));
  const [replyAwaited] = useState(result === undefined);
  if (result) return <FinalResultBody result={result} headline={replyAwaited ? { ...headline, burst: false } : headline} {...rest} />;
  const { tone } = headline;
  return (
    <QuizResultFrame
      saved={saved}
      onToggleSave={onToggleSave}
      onClose={onLeave}
      tone={tone}
      action={<ResultButton testID="result-action-btn" tone={tone} label={nextLessonLabel(null)} icon="next" onPress={() => undefined} loading />}
      rating={<LessonRatingControl lessonId={lessonId} rating={lessonRating ?? null} color={results[tone].fg} />}
    >
      <ResultHeading headline={headline} />
    </QuizResultFrame>
  );
}

/**
 * Sends the result's rewards to the celebration queue, once, and says when the metres chip may show:
 * after they are queued and the queue has emptied, so the chip comes last (strategy 4.1 rule 4).
 */
function useChipTurn(rewards: Rewards | null): boolean {
  const [queued, setQueued] = useState(false);
  const queueEmpty = useCelebrationQueueStore((s) => s.queue.length === 0);
  useEffect(() => {
    if (rewards !== null) enqueueRewards(rewards);
    setQueued(true);
  }, [rewards]);
  return queued && queueEmpty;
}

type FinalResultBodyProps = Omit<FinalResultViewProps, 'result' | 'correct' | 'lessonRating'> & { result: QuizResult; headline: ResultHeadline };

/** The finished lesson's verdict, with the metres chip, earned achievements and any end-of-topic feedback. */
function FinalResultBody({ result, headline, lessonId, saved, onToggleSave, onLeave, onNavigate }: FinalResultBodyProps) {
  const { feedbacks, streak, milestone, trackAccuracy, previousTrackAccuracy, nextLessonId } = result;
  const { tone } = headline;
  // A pass that paid nothing shows no chip and no line. The chip waits for the unlocks to be celebrated.
  const chipCopy = metresChipOf(result.rewards);
  const chipTurn = useChipTurn(result.rewards);
  const chipToShow = chipTurn ? chipCopy : null;
  const insets = useSafeAreaInsets();
  const topicFeedback = useTopicFeedback();
  const refreshPaths = useRefreshPaths();
  const [chipDismissed, setChipDismissed] = useState(false);
  // Where the metres chip sits on the screen, so the chip animation can fly back onto it.
  const [chipRect, setChipRect] = useState<ScreenRect | null>(null);
  const [topicFeedbackClosed, setTopicFeedbackClosed] = useState(false);
  const accuracyAnim = useRef(new Animated.Value(0)).current;
  const milestoneAnim = useRef(new Animated.Value(MILESTONE_START_SCALE)).current;

  useEffect(() => {
    Animated.spring(accuracyAnim, SPRING_IN).start();
    if (!milestone) return;
    Animated.spring(milestoneAnim, SPRING_IN).start();
  }, [accuracyAnim, milestoneAnim, milestone]);

  const topicEnd = topicFeedbackClosed ? null : result.topicEnd;
  // Where the page's tail (topic feedback and the button) comes in: after every block above it.
  const tailStep = feedbacks.length;

  const overlay = (
    <>
      {chipToShow !== null && !chipDismissed && (
        <MetresChipOverlay visible copy={chipToShow} anchor={headerRowBox(insets.top)} returnTo={chipRect} onDismiss={() => setChipDismissed(true)} />
      )}
    </>
  );

  return (
    <QuizResultFrame
      saved={saved}
      onToggleSave={onToggleSave}
      onClose={onLeave}
      overlay={overlay}
      tone={tone}
      action={<FinalResultActions tone={tone} nextLessonId={nextLessonId} onNavigate={onNavigate} />}
      /* 079f: the result's lesson carries the stored verdict, so no refetch. */
      rating={<LessonRatingControl lessonId={lessonId} rating={result.lesson.rating ?? null} color={results[tone].fg} />}
    >
      <ResultHeading headline={headline}>
        <View style={styles.statsRow}>
          {chipToShow !== null && <MetresAward copy={chipToShow} tone={tone} onMeasure={setChipRect} />}
          <Animated.View style={{ transform: [{ scale: accuracyAnim }] }}>
            <TrackAccuracyBadge accuracy={trackAccuracy} previous={previousTrackAccuracy} tone={tone} />
          </Animated.View>
        </View>
      </ResultHeading>
      {milestone && <MilestoneCard milestone={milestone} streak={streak} scale={milestoneAnim} />}
      {/* The rest arrives block by block, after the heading (096, experiment 53). */}
      {feedbacks.map((fb, i) => (
        <Reveal key={fb.quizId} delay={revealDelay(i)}><QuizFeedbackCard fb={fb} tone={tone} showQuestion={feedbacks.length > 1} /></Reveal>
      ))}
      {/* End-of-topic feedback (079d). Closing hides it here only: the write already
          happened, so Home will not show it again; one never written comes back on Home. */}
      <Reveal delay={revealDelay(tailStep)}>
        {topicEnd && (
          // The screen is drawn for paper, so on a verdict colour it sits on a paper panel.
          <View style={styles.topicFeedbackPanel}>
            <TopicFeedback
              topicEnd={topicEnd}
              onSubmit={body => topicFeedback.submit(topicEnd.planId, body)}
              onClose={() => { setTopicFeedbackClosed(true); refreshPaths(); }}
            />
          </View>
        )}
      </Reveal>
    </QuizResultFrame>
  );
}

/** The pinned actions: the way on, with Home beside it when there is a next lesson. Unlocks are celebrated by the queue, not here. */
function FinalResultActions({ tone, nextLessonId, onNavigate }: {
  tone: ResultTone;
  nextLessonId: string | null | undefined;
  onNavigate: (nextLessonId: string | null | undefined) => void;
}) {
  return (
    <View style={styles.actions}>
      {/* A small word beside the button. With no next lesson the button itself goes Home. */}
      {nextLessonId && (
        <Pressable testID="result-home-btn" accessibilityRole="button" onPress={() => onNavigate(null)} style={styles.smallTouch}>
          <Text style={[styles.smallWord, { color: results[tone].fg }]}>Home</Text>
        </Pressable>
      )}
      <View style={styles.mainButton}>
        <ResultButton testID="result-action-btn" tone={tone} label={nextLessonLabel(nextLessonId)} icon="next" onPress={() => onNavigate(nextLessonId)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  mainButton: { flex: 1 },
  smallTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  smallWord: { fontFamily: font.bold, fontSize: 15 },
  topicFeedbackPanel: { padding: spacing.lg, backgroundColor: colors.paper, borderRadius: radius.xl },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm3 },
});
