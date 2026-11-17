import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuizFeedback, QuizResult } from '@learning/shared';
import { ACHIEVEMENTS_BY_KEY } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { TopicFeedback } from '@/components/ui/TopicFeedback';
import { LessonRatingControl } from '@/components/ui/LessonRatingControl';
import { XpChipOverlay, type ScreenRect } from '@/components/ui/CelebrationOverlay';
import { Reveal, revealDelay } from '@/components/ui/Reveal';
import { AchievementUnlock } from '@/components/quiz/AchievementUnlock';
import { QuizFeedbackCard } from '@/components/quiz/QuizFeedbackCard';
import { QuizResultFrame, headerRowBox } from '@/components/quiz/QuizResultFrame';
import { ResultButton } from '@/components/quiz/ResultButton';
import { ResultHeading } from '@/components/quiz/ResultHeading';
import { CoachingCard, MilestoneCard, TrackAverageBadge, XpAward } from '@/components/quiz/QuizResultParts';
import { nextLessonLabel } from '@/components/quiz/nextLessonLabel';
import type { ResultTone } from '@/components/quiz/resultTone';
import { useRefreshPaths, useTopicFeedback } from '@/hooks/useTrack';
import { colors, font, radius, results, spacing } from '@/theme';

/** The milestone card grows in from this scale when the lesson is finalised. */
const MILESTONE_START_SCALE = 0.8;

interface FinalResultViewProps {
  /** A submit that finalised the lesson. The view mounts fresh for each one, so its state starts clean. */
  result: QuizResult;
  lessonId: string;
  /** The answer was a second try, which the average badge says. */
  retakeUsed: boolean;
  saved: boolean;
  onToggleSave: () => void;
  /** ✕: leave the lesson for where it was opened from. */
  onLeave: () => void;
  /** The way on: the next lesson, or Home with none. */
  onNavigate: (nextLessonId: string | null | undefined) => void;
}

/** The finished lesson's verdict, with the XP chip, earned achievements, coaching and any end-of-topic feedback. */
export function FinalResultView({ result, lessonId, retakeUsed, saved, onToggleSave, onLeave, onNavigate }: FinalResultViewProps) {
  const { feedbacks, coaching, streak, milestone, trackAverage, previousAverage, xpAwarded, nextLessonId } = result;
  const xpEarned = xpAwarded != null && xpAwarded > 0;
  const tone: ResultTone = result.correct ? 'correct' : 'incorrect';
  const unlockedKeys = (result.achievementsUnlocked ?? []).filter(key => ACHIEVEMENTS_BY_KEY[key]);
  const insets = useSafeAreaInsets();
  const topicFeedback = useTopicFeedback();
  const refreshPaths = useRefreshPaths();
  const [xpChipShown, setXpChipShown] = useState(xpEarned);
  // Where the XP chip sits on the screen, so the XP animation can fly back onto it.
  const [xpRect, setXpRect] = useState<ScreenRect | null>(null);
  /** Which unlock screen is up (null: the result itself), and whether they have all been seen or skipped. */
  const [unlockStep, setUnlockStep] = useState<number | null>(null);
  const [unlocksDone, setUnlocksDone] = useState(false);
  const [topicFeedbackClosed, setTopicFeedbackClosed] = useState(false);
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const milestoneAnim = useRef(new Animated.Value(MILESTONE_START_SCALE)).current;

  useEffect(() => {
    Animated.spring(scoreAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    if (!milestone) return;
    Animated.spring(milestoneAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [scoreAnim, milestoneAnim, milestone]);

  const topicEnd = topicFeedbackClosed ? null : result.topicEnd;
  // Where the page's tail (topic feedback and the button) comes in: after every block above it.
  const tailStep = feedbacks.length + (coaching ? 1 : 0);
  const unlocksPending = unlockedKeys.length > 0 && !unlocksDone;
  const shownUnlock = unlockStep === null ? undefined : unlockedKeys[unlockStep];

  function continueUnlocks() {
    if (unlockStep !== null && unlockStep + 1 < unlockedKeys.length) {
      setUnlockStep(unlockStep + 1);
      return;
    }
    setUnlockStep(null);
    setUnlocksDone(true);
  }

  const overlay = (
    <>
      {xpChipShown && xpEarned && (
        <XpChipOverlay visible xp={xpAwarded} anchor={headerRowBox(insets.top)} returnTo={xpRect} onDismiss={() => setXpChipShown(false)} />
      )}
      {shownUnlock && (
        // Over the result, which stays mounted underneath so coming back does not replay it.
        <View style={StyleSheet.absoluteFill}>
          <AchievementUnlock key={shownUnlock} achievement={shownUnlock} onContinue={continueUnlocks} />
        </View>
      )}
    </>
  );

  const action = unlocksPending ? (
    // Earned achievements come before the way on: view them one by one, or skip them.
    <View style={styles.actions}>
      <Pressable testID="achievements-skip-btn" accessibilityRole="button" onPress={() => setUnlocksDone(true)} style={styles.smallTouch}>
        <Text style={[styles.smallWord, { color: results[tone].tint }]}>Skip</Text>
      </Pressable>
      <View style={styles.mainButton}>
        <ResultButton
          testID="result-action-btn"
          tone={tone}
          label={unlockedKeys.length === 1 ? 'See achievement' : `See ${unlockedKeys.length} achievements`}
          icon="next"
          onPress={() => setUnlockStep(0)}
        />
      </View>
    </View>
  ) : (
    <View style={styles.actions}>
      {/* A small word beside the button, as Skip is beside "See achievement". With no next lesson the button itself goes Home. */}
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

  return (
    <QuizResultFrame
      saved={saved}
      onToggleSave={onToggleSave}
      onClose={onLeave}
      overlay={overlay}
      tone={tone}
      action={action}
      /* 079f: the result's lesson carries the stored verdict, so no refetch. */
      rating={<LessonRatingControl lessonId={lessonId} rating={result.lesson.rating ?? null} color={results[tone].fg} />}
    >
      <ResultHeading tone={tone}>
        <View style={styles.statsRow}>
          {xpEarned && <XpAward xp={xpAwarded} tone={tone} onMeasure={setXpRect} />}
          <Animated.View style={{ transform: [{ scale: scoreAnim }] }}>
            <TrackAverageBadge average={trackAverage} previous={previousAverage} retakeUsed={retakeUsed} tone={tone} />
          </Animated.View>
        </View>
      </ResultHeading>
      {milestone && <MilestoneCard milestone={milestone} streak={streak} scale={milestoneAnim} />}
      {/* The rest arrives block by block, after the heading (096, experiment 53). */}
      {feedbacks.map((fb: QuizFeedback, i: number) => (
        <Reveal key={fb.quizId} delay={revealDelay(i)}><QuizFeedbackCard fb={fb} tone={tone} showQuestion={feedbacks.length > 1} /></Reveal>
      ))}
      {coaching && <Reveal delay={revealDelay(feedbacks.length)}><CoachingCard coaching={coaching} /></Reveal>}
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

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  mainButton: { flex: 1 },
  smallTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  smallWord: { fontFamily: font.bold, fontSize: 15 },
  topicFeedbackPanel: { padding: spacing.lg, backgroundColor: colors.paper, borderRadius: radius.xl },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm3 },
});
