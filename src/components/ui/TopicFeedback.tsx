import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TOPIC_FEEDBACK_ACKNOWLEDGEMENT,
  TOPIC_FEEDBACK_LEVELS,
  TOPIC_FEEDBACK_LEVEL_LABELS,
  TOPIC_FEEDBACK_USEFUL,
  TOPIC_FEEDBACK_USEFUL_LABELS,
  TOPIC_FEEDBACK_WORDS_MAX,
  hasTopicFeedbackAnswer,
  topicFeedbackRequest,
  type TopicEnd,
  type TopicFeedbackLevel,
  type TopicFeedbackRequest,
  type TopicFeedbackUseful,
} from '@learning/shared';
import { colors, font, fontSize, radius, shadow, spacing, tracking } from '@/theme';
import { Button } from '@/components/ui/Button';
import { SegmentedControl, type SegmentTone } from '@/components/ui/SegmentedControl';
import { StepSummary } from '@/components/ui/StepSummary';
import { extractError } from '@/lib/errors';

/** How long the acknowledgement shows before the box closes itself. */
const ACKNOWLEDGEMENT_MS = 2000;

type IconName = ComponentProps<typeof Ionicons>['name'];

/** The questions, in the order they open. Exactly one is open at a time. */
type Step = 'level' | 'useful' | 'words';

const WORDS_LABEL = 'Anything else Albert should know?';

const LEVEL_ICONS = { knew_most: 'arrow-down-circle-outline', about_right: 'locate-outline', lost_me: 'arrow-up-circle-outline' } satisfies Record<TopicFeedbackLevel, IconName>;
const LEVEL_TONES = { knew_most: 'amber', about_right: 'success', lost_me: 'coral' } satisfies Record<TopicFeedbackLevel, SegmentTone>;
const USEFUL_ICONS = { not_for_me: 'thumbs-down-outline', useful: 'thumbs-up-outline', want_more: 'add-circle-outline' } satisfies Record<TopicFeedbackUseful, IconName>;
const USEFUL_TONES = { not_for_me: 'neutral', useful: 'brand', want_more: 'violet' } satisfies Record<TopicFeedbackUseful, SegmentTone>;

interface TopicFeedbackProps {
  topicEnd: TopicEnd;
  /** Writes the answer. Rejecting keeps the screen open and shows the error. */
  onSubmit: (body: TopicFeedbackRequest) => Promise<unknown>;
  /** Called once the screen is finished: after a dismissal, or once the acknowledgement has shown. */
  onClose: () => void;
}

/**
 * The end-of-topic screen (079d): two optional taps and optional words. Closing always writes:
 * what was picked, or `dismissed` on Skip. It never changes the path and never blocks.
 */
export function TopicFeedback({ topicEnd, onSubmit, onClose }: TopicFeedbackProps) {
  const [level, setLevel] = useState<TopicFeedbackLevel | null>(null);
  const [useful, setUseful] = useState<TopicFeedbackUseful | null>(null);
  const [words, setWords] = useState('');
  const [openStep, setOpenStep] = useState<Step>('level');
  const [wordsFocused, setWordsFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const answered = hasTopicFeedbackAnswer({ level, useful, words });

  useEffect(() => {
    if (!acknowledged) return;
    const timer = setTimeout(() => onCloseRef.current(), ACKNOWLEDGEMENT_MS);
    return () => clearTimeout(timer);
  }, [acknowledged]);

  function open(step: Step) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWordsFocused(false);
    setOpenStep(step);
  }

  /** Picking answers the step and opens the next one; clearing a pick leaves the open step alone. */
  function pickLevel(value: TopicFeedbackLevel | null) {
    setLevel(value);
    if (value !== null) open('useful');
  }

  function pickUseful(value: TopicFeedbackUseful | null) {
    setUseful(value);
    if (value !== null) open('words');
  }

  /** Writes the answer, or a dismissal when `dismiss`. Returns whether the write succeeded. */
  async function write(dismiss: boolean) {
    setSending(true);
    setError('');
    const answer = dismiss ? { level: null, useful: null, words: '' } : { level, useful, words };
    try {
      await onSubmit(topicFeedbackRequest(topicEnd.stableKey, answer));
    } catch (err) {
      setError(extractError(err));
      setSending(false);
      return;
    }
    // A dismissal closes the screen, so there is nothing left to update.
    if (dismiss) return onClose();
    setSending(false);
    setAcknowledged(true);
  }

  if (acknowledged) {
    return (
      <View testID="topic-feedback" style={styles.card}>
        <Text style={styles.heading}>{TOPIC_FEEDBACK_ACKNOWLEDGEMENT}</Text>
      </View>
    );
  }

  return (
    <View testID="topic-feedback" accessibilityLabel="Topic feedback" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Ionicons name="flag-outline" size={20} color={colors.brand} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>End of topic</Text>
          <Text testID="topic-feedback-title" numberOfLines={2} style={styles.heading}>
            {'How was '}
            <Text style={styles.headingTopic}>{topicEnd.title}</Text>
            {'?'}
          </Text>
        </View>
        <Pressable
          testID="topic-feedback-skip"
          accessibilityRole="button"
          disabled={sending}
          style={styles.skipTouch}
          onPress={() => write(true)}
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <SegmentedControl label="Level" testIDPrefix="topic-feedback-level" options={TOPIC_FEEDBACK_LEVELS} labels={TOPIC_FEEDBACK_LEVEL_LABELS} icons={LEVEL_ICONS} tones={LEVEL_TONES} picked={level} open={openStep === 'level'} onOpen={() => open('level')} disabled={sending} onPick={pickLevel} />
      <SegmentedControl label="Useful" testIDPrefix="topic-feedback-useful" options={TOPIC_FEEDBACK_USEFUL} labels={TOPIC_FEEDBACK_USEFUL_LABELS} icons={USEFUL_ICONS} tones={USEFUL_TONES} picked={useful} open={openStep === 'useful'} onOpen={() => open('useful')} disabled={sending} onPick={pickUseful} />

      {openStep === 'words' ? (
        <TextInput
          testID="topic-feedback-words"
          accessibilityLabel={WORDS_LABEL}
          placeholder={WORDS_LABEL}
          placeholderTextColor={colors.textMuted}
          value={words}
          onChangeText={setWords}
          maxLength={TOPIC_FEEDBACK_WORDS_MAX}
          editable={!sending}
          multiline
          numberOfLines={2}
          onFocus={() => setWordsFocused(true)}
          onBlur={() => setWordsFocused(false)}
          style={[styles.words, wordsFocused && styles.wordsFocused]}
        />
      ) : (
        <StepSummary
          testID="topic-feedback-words-summary"
          label={WORDS_LABEL}
          value={words.trim() === '' ? undefined : words.trim()}
          disabled={sending}
          onPress={() => open('words')}
        />
      )}

      {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <Button
        testID="topic-feedback-submit"
        label="Send"
        variant="coral"
        size="lg"
        disabled={!answered}
        loading={sending}
        onPress={() => write(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    ...shadow.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm3 },
  iconTile: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  headerText: { flex: 1, gap: spacing.xs },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    letterSpacing: tracking.caps,
    textTransform: 'uppercase',
    color: colors.coral,
  },
  heading: { fontFamily: font.display, fontSize: fontSize.md, letterSpacing: tracking.tight, color: colors.textStrong },
  headingTopic: { fontStyle: 'italic' },
  skipTouch: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.textMuted },
  words: {
    minHeight: 64,
    padding: spacing.sm3,
    textAlignVertical: 'top',
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.textStrong,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  wordsFocused: { borderColor: colors.brand },
  error: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
