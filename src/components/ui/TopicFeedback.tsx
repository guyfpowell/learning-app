import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
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
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { extractError } from '@/lib/errors';

interface TopicFeedbackProps {
  topicEnd: TopicEnd;
  /** Writes the answer. Rejecting keeps the screen open and shows the error. */
  onSubmit: (body: TopicFeedbackRequest) => Promise<unknown>;
  /** Called once the screen is finished: after a dismissal, or on Close after the acknowledgement. */
  onClose: () => void;
}

interface ScaleProps<T extends string> {
  name: string;
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  picked: T | null;
  disabled: boolean;
  onPick: (value: T | null) => void;
}

/** One optional scale. Tapping the picked option again unpicks it. */
function Scale<T extends string>({ name, label, options, labels, picked, disabled, onPick }: ScaleProps<T>) {
  return (
    <View accessibilityLabel={label} style={styles.scale}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map(option => (
          <Button
            key={option}
            testID={`topic-feedback-${name}-${option}`}
            label={labels[option]}
            variant={picked === option ? 'primary' : 'secondary'}
            inline
            disabled={disabled}
            accessibilityState={{ selected: picked === option }}
            onPress={() => onPick(picked === option ? null : option)}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * The end-of-topic screen (079d): two optional taps and optional words. Closing always writes:
 * what was picked, or `dismissed` if nothing was. It never changes the path and never blocks.
 */
export function TopicFeedback({ topicEnd, onSubmit, onClose }: TopicFeedbackProps) {
  const [level, setLevel] = useState<TopicFeedbackLevel | null>(null);
  const [useful, setUseful] = useState<TopicFeedbackUseful | null>(null);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [words, setWords] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const answered = hasTopicFeedbackAnswer({ level, useful, words });

  async function send() {
    setSending(true);
    setError('');
    try {
      await onSubmit(topicFeedbackRequest(topicEnd.stableKey, { level, useful, words }));
    } catch (err) {
      setError(extractError(err));
      setSending(false);
      return;
    }
    // A dismissal closes the screen, so there is nothing left to update.
    if (!answered) return onClose();
    setSending(false);
    setAcknowledged(true);
  }

  if (acknowledged) {
    return (
      <View testID="topic-feedback" style={styles.card}>
        <Text style={styles.body}>{TOPIC_FEEDBACK_ACKNOWLEDGEMENT}</Text>
        <Button testID="topic-feedback-close" label="Close" variant="ghost" onPress={onClose} />
      </View>
    );
  }

  return (
    <View testID="topic-feedback" accessibilityLabel="Topic feedback" style={styles.card}>
      <Text testID="topic-feedback-title" style={styles.heading}>
        {'How was '}
        <Text style={styles.headingTopic}>{topicEnd.title}</Text>
        {'?'}
      </Text>

      <Scale name="level" label="Level" options={TOPIC_FEEDBACK_LEVELS} labels={TOPIC_FEEDBACK_LEVEL_LABELS} picked={level} disabled={sending} onPick={setLevel} />
      <Scale name="useful" label="Useful" options={TOPIC_FEEDBACK_USEFUL} labels={TOPIC_FEEDBACK_USEFUL_LABELS} picked={useful} disabled={sending} onPick={setUseful} />

      {wordsOpen ? (
        <TextInput
          testID="topic-feedback-words"
          accessibilityLabel="Anything else Albert should know?"
          placeholder="Anything else Albert should know?"
          placeholderTextColor={colors.textMuted}
          value={words}
          onChangeText={setWords}
          maxLength={TOPIC_FEEDBACK_WORDS_MAX}
          editable={!sending}
          multiline
          style={styles.words}
        />
      ) : (
        <Button
          testID="topic-feedback-words-toggle"
          label="Anything else Albert should know?"
          variant="ghost"
          onPress={() => setWordsOpen(true)}
        />
      )}

      {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <Button
        testID="topic-feedback-submit"
        label={answered ? 'Send' : 'Not now'}
        variant={answered ? 'primary' : 'ghost'}
        loading={sending}
        onPress={send}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
  },
  heading: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.textStrong },
  headingTopic: { fontStyle: 'italic' },
  body: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.textStrong },
  scale: { gap: spacing.xs },
  scaleLabel: { fontFamily: font.medium, fontSize: fontSize.sm, color: colors.textMuted },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  words: {
    minHeight: 80,
    padding: spacing.sm,
    textAlignVertical: 'top',
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.textStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  error: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
