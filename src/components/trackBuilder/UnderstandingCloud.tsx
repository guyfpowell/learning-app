/**
 * What we understood, in the user's own words — Rule 10, 049b Chunk 6.
 *
 * **Between asking and answering, the user sees the system's understanding —
 * not a plan.** No lessons, no topics, no catalogue vocabulary. Just their own
 * words, growing as they say more.
 *
 * The point is that a misreading becomes correctable *before* a plan exists.
 * A wrong plan at the end is expensive feedback; a wrong word here is spotted
 * on sight and costs one correction. The rule's worked example is a user seeing
 * `fintech` come out large and knowing instantly that their industry had been
 * mistaken for their request — which is why context is greyed rather than
 * hidden. Hide it and that misreading stays invisible until the plan arrives.
 *
 * A negated request is struck through, never removed: an exclusion the user
 * cannot see is one they cannot confirm was heard, and negation — the only
 * destructive operation in the whole flow — should be the most visible one.
 *
 * Kept in step with the web component of the same name deliberately: the two
 * clients have diverged before, and a rule only one of them obeys is not a rule.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, spacing } from '@/theme';
import type { CloudTerm } from '@/services/trackBuilder.service';

/** Size follows how much they have said about it, never how much it matched. */
const sizeOf = (weight: number) => fontSize.sm + weight * 8;

const ORDER = { request: 0, detail: 1, context: 2 } as const;

export function UnderstandingCloud({ terms }: { terms: CloudTerm[] }) {
  if (terms.length === 0) return null;

  // Requests first, then how they qualified them, then who they are. The order
  // is the sentence's own priority and keeps the eye on what was asked for.
  const sorted = [...terms].sort(
    (a, b) => ORDER[a.kind] - ORDER[b.kind] || b.weight - a.weight,
  );

  return (
    <View testID="understanding-cloud" style={styles.wrap}>
      <Text style={styles.lead}>
        Here’s what I’ve got so far — tell me if I’ve read any of it wrong.
      </Text>
      <View style={styles.cloud}>
        {sorted.map((t) => (
          <Text
            key={`${t.request}:${t.text}`}
            testID={`cloud-term-${t.kind}`}
            style={[
              styles.term,
              { fontSize: sizeOf(t.weight) },
              t.kind === 'request' ? styles.request : null,
              t.kind === 'context' ? styles.context : null,
              t.struck ? styles.struck : null,
            ]}
          >
            {t.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  lead: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  cloud: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline',
    columnGap: spacing.md, rowGap: spacing.sm,
  },
  term: { fontFamily: font.regular, color: colors.textDark },
  request: { fontFamily: font.bold },
  context: { color: colors.textMuted },
  struck: { textDecorationLine: 'line-through', opacity: 0.55 },
});
