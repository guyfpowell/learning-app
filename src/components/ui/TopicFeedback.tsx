import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import {
  TOPIC_FEEDBACK_ACKNOWLEDGEMENT,
  TOPIC_FEEDBACK_LEVELS,
  TOPIC_FEEDBACK_USEFUL,
  TOPIC_FEEDBACK_WORDS_MAX,
  hasTopicFeedbackAnswer,
  topicFeedbackRequest,
  type TopicEnd,
  type TopicFeedbackLevel,
  type TopicFeedbackRequest,
  type TopicFeedbackUseful,
} from '@learning/shared';
import { colors, font, fontSize, press, radius, shadow, spacing, trackingEm } from '@/theme';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { WordChoice } from '@/components/ui/WordChoice';
import { extractError } from '@/lib/errors';

/** How long the acknowledgement shows before the box closes itself. */
const ACKNOWLEDGEMENT_MS = 2000;

const WORDS_LABEL = 'Anything else to tell Albert?';
const WORDS_PLACEHOLDER = 'Something unclear, or what you\u2019d like more of';

// The design's words for the two questions (the shared labels are the web's). The values sent are unchanged.
const LEVEL_WORDS: Record<TopicFeedbackLevel, string> = { knew_most: 'Too easy', about_right: 'About right', lost_me: 'Too hard' };
const USEFUL_WORDS: Record<TopicFeedbackUseful, string> = { not_for_me: 'Not really', useful: 'A bit', want_more: 'Very' };

interface TopicFeedbackProps {
  topicEnd: TopicEnd;
  /** Writes the answer. Rejecting keeps the screen open and shows the error. */
  onSubmit: (body: TopicFeedbackRequest) => Promise<unknown>;
  /** Called once the screen is finished: after a dismissal, or once the acknowledgement has shown. */
  onClose: () => void;
}

/**
 * The end-of-topic screen (079d): two optional taps and optional words, all visible at once.
 * Not now always writes `dismissed`; Send writes what was picked. It never changes the path and never blocks.
 */
export function TopicFeedback({ topicEnd, onSubmit, onClose }: TopicFeedbackProps) {
  const [level, setLevel] = useState<TopicFeedbackLevel | null>(null);
  const [useful, setUseful] = useState<TopicFeedbackUseful | null>(null);
  const [words, setWords] = useState('');
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
      <View testID="topic-feedback" style={styles.screen}>
        <Text style={styles.acknowledgement}>{TOPIC_FEEDBACK_ACKNOWLEDGEMENT}</Text>
      </View>
    );
  }

  return (
    <View testID="topic-feedback" accessibilityLabel="Topic feedback" style={styles.screen}>
      <View style={styles.header}>
        <Text testID="topic-feedback-title" numberOfLines={3} style={styles.title}>{topicEnd.title}</Text>
        <View style={styles.complete}>
          <View style={styles.tick}>
            <Icon name="check" size={13} color={colors.white} strokeWidth={3.2} />
          </View>
          <Text style={styles.completeText}>Topic complete</Text>
        </View>
      </View>

      <WordChoice label="How hard was this topic" testIDPrefix="topic-feedback-level" options={TOPIC_FEEDBACK_LEVELS} labels={LEVEL_WORDS} picked={level} disabled={sending} onPick={setLevel} />
      <WordChoice label="How useful was it" testIDPrefix="topic-feedback-useful" options={TOPIC_FEEDBACK_USEFUL} labels={USEFUL_WORDS} picked={useful} disabled={sending} onPick={setUseful} />

      <View style={styles.note}>
        <Text style={styles.noteLabel}>{WORDS_LABEL}</Text>
        <TextInput
          testID="topic-feedback-words"
          accessibilityLabel={WORDS_LABEL}
          placeholder={WORDS_PLACEHOLDER}
          placeholderTextColor={colors.textSubtle}
          value={words}
          onChangeText={setWords}
          maxLength={TOPIC_FEEDBACK_WORDS_MAX}
          editable={!sending}
          multiline
          style={styles.words}
        />
      </View>

      {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable
          testID="topic-feedback-skip"
          accessibilityRole="button"
          disabled={sending}
          style={styles.skipTouch}
          onPress={() => write(true)}
        >
          <Text style={styles.skip}>Not now</Text>
        </Pressable>
        <View style={styles.send}>
          <EdgeButton
            testID="topic-feedback-submit"
            look={{ face: colors.brand, label: colors.white, edge: press.primaryEdge }}
            disabledLook={{ face: colors.border, label: colors.textSubtle }}
            label="Send"
            disabled={!answered}
            loading={sending}
            onPress={() => write(false)}
          />
        </View>
      </View>
    </View>
  );
}

const TITLE_SIZE = 32;

const styles = StyleSheet.create({
  screen: { gap: 28, marginBottom: spacing.md },
  header: { gap: spacing.sm3 },
  title: {
    fontFamily:    font.black,
    fontSize:      TITLE_SIZE,
    lineHeight:    TITLE_SIZE * 1.04,
    letterSpacing: -0.04 * TITLE_SIZE,
    color:         colors.textStrong,
  },
  complete:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tick: {
    width:           22,
    height:          22,
    borderRadius:    7,
    backgroundColor: colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
  },
  completeText: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textStrong },
  acknowledgement: {
    fontFamily:    font.black,
    fontSize:      fontSize.lg,
    letterSpacing: trackingEm.heading * fontSize.lg,
    color:         colors.textStrong,
  },
  // The one card on the page: the note is the only thing typed.
  note: {
    gap:               10,
    padding:           18,
    marginHorizontal:  -spacing.sm,
    backgroundColor:   colors.surface,
    borderRadius:      radius.card,
    ...shadow.card,
  },
  noteLabel: { fontFamily: font.extrabold, fontSize: fontSize.base, letterSpacing: -0.01 * fontSize.base, color: colors.textStrong },
  words: {
    minHeight:         44,
    padding:           0,
    textAlignVertical: 'top',
    fontFamily:        font.regular,
    fontSize:          15,
    lineHeight:        15 * 1.45,
    color:             colors.textStrong,
  },
  error:   { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  skipTouch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  skip:      { fontFamily: font.bold, fontSize: 15, color: colors.textMuted },
  send:      { flex: 1 },
});
