import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { splitExplanation } from '@/lib/explanation';
import { colors, font, fontSize, lineHeight, radius, results, spacing, trackingEm } from '@/theme';
import { TONE_LOOK, toneRule, type ResultTone } from '@/components/quiz/resultTone';

const MARK_SIZE = 22;
const MARK_ICON_SIZE = 13;
const ANSWER_MARK_SIZE = 28;
const ANSWER_ICON_SIZE = 16;
const LEAD_SIZE = 19;
const BODY_SIZE = 17;
const HINT_SIZE = 23;

/** The small tile and word above the headline: CORRECT, ONE MORE TRY, INCORRECT. */
export function VerdictMark({ tone }: { tone: ResultTone }) {
  const look = TONE_LOOK[tone];
  return (
    <View testID="verdict-mark" style={styles.verdict}>
      <View style={[styles.verdictTile, { backgroundColor: look.tileBg }]}>
        <Icon name={look.glyph} size={MARK_ICON_SIZE} color={look.tileFg} strokeWidth={3.2} />
      </View>
      <Text style={[styles.eyebrow, { color: results[tone].fg }]}>{look.word}</Text>
    </View>
  );
}

function Eyebrow({ tone, children }: { tone: ResultTone; children: string }) {
  return <Text style={[styles.label, { color: results[tone].tint }]}>{children}</Text>;
}

/** One answer: a small tile, a caps label, and the answer in bold (struck through when it was wrong). */
export function AnswerRow({ tone, label, answer, mark, struck = false }: {
  tone: ResultTone;
  label: string;
  answer: string;
  mark: 'right' | 'wrong';
  struck?: boolean;
}) {
  const glyph: IconName = mark === 'right' ? 'check' : 'close';
  return (
    <View style={styles.answerRow}>
      <View style={[styles.answerMark, { backgroundColor: mark === 'right' ? colors.white : colors.error }]}>
        <Icon name={glyph} size={ANSWER_ICON_SIZE} color={mark === 'right' ? colors.successDark : colors.white} strokeWidth={3} />
      </View>
      <View style={styles.answerText}>
        <Eyebrow tone={tone}>{label}</Eyebrow>
        <Text style={[styles.answer, { color: results[tone].fg }, struck && styles.struck]}>{answer}</Text>
      </View>
    </View>
  );
}

/** A hairline, a caps label, then the lead sentence in bold and the rest of the text below it. */
export function WhySection({ tone, text }: { tone: ResultTone; text: string }) {
  const { lead, rest } = splitExplanation(text);
  return (
    <View testID="why-section" style={[styles.section, { borderTopColor: toneRule(tone) }]}>
      <Eyebrow tone={tone}>WHY</Eyebrow>
      <Text style={[styles.lead, { color: results[tone].fg }]}>{lead}</Text>
      {rest !== '' && <Text style={[styles.body, { color: results[tone].text }]}>{rest}</Text>}
    </View>
  );
}

/** The retry screen's nudge. It never reveals the answer. */
export function HintSection({ tone, text }: { tone: ResultTone; text: string }) {
  return (
    <View testID="hint-section" style={[styles.section, { borderTopColor: toneRule(tone) }]}>
      <Eyebrow tone={tone}>HINT</Eyebrow>
      <Text style={[styles.hint, { color: results[tone].fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  verdict:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verdictTile: { width: MARK_SIZE, height: MARK_SIZE, borderRadius: radius.xs - 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow:     { fontFamily: font.black, fontSize: fontSize.xs + 1, letterSpacing: trackingEm.caps * (fontSize.xs + 1) },
  label:       { fontFamily: font.extrabold, fontSize: fontSize.xs, letterSpacing: trackingEm.caps * fontSize.xs },
  answerRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm3, marginBottom: spacing.md },
  answerMark:  { width: ANSWER_MARK_SIZE, height: ANSWER_MARK_SIZE, borderRadius: radius.xs, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  answerText:  { flex: 1, gap: spacing.xs },
  answer:      { fontFamily: font.bold, fontSize: fontSize.md - 1, lineHeight: (fontSize.md - 1) * lineHeight.normal - spacing.xs },
  struck:      { textDecorationLine: 'line-through' },
  section:     { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg, marginTop: spacing.sm, gap: spacing.sm3 },
  lead:        { fontFamily: font.bold, fontSize: LEAD_SIZE, lineHeight: LEAD_SIZE * lineHeight.normal },
  body:        { fontFamily: font.medium, fontSize: BODY_SIZE, lineHeight: BODY_SIZE * lineHeight.relaxed },
  hint:        { fontFamily: font.bold, fontSize: HINT_SIZE, lineHeight: HINT_SIZE * lineHeight.normal },
});
