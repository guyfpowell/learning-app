import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useDraftStore } from '@/store/trackBuilder.store';
import { useRefinePlan, useCreateTrackPlan, useBuildPlan } from '@/hooks/useTrackBuilder';
import type { BuiltPlanTopic } from '@/services/trackBuilder.service';
import { extractError } from '@/lib/errors';

/**
 * Review the built path — ticket 049 Chunk 5, mobile parity with the web
 * review screen.
 *
 * Shows its working: which area chose each topic, and which were added as
 * groundwork. Measured in 060, dependency closure is 53% of the average plan,
 * so a user looking at something twice as long as their ask deserves to see why.
 *
 * Intent routing is NOT here — the server returns an `action` and this screen
 * renders it. The rule that matters, *a control intent must never rebuild the
 * plan*, is the kind that gets lost in a UI; it was lost once already in the
 * 060 harness, where a correctly-detected refinement destroyed the plan.
 */

const CLOSURE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Everything' },
  { value: 1, label: 'Just the basics' },
  { value: 0, label: 'None' },
];

export default function BuildReviewScreen() {
  const router = useRouter();
  const { draft, updateResult, clearDraft } = useDraftStore();

  const [name, setName] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [closureDepth, setClosureDepth] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<
    { removed: number; previous: BuiltPlanTopic[] } | null
  >(null);

  const refine = useRefinePlan();
  const rebuild = useBuildPlan();
  const createPlan = useCreateTrackPlan();

  useEffect(() => {
    if (!draft) {
      // Nothing to review — app restarted, or arrived here directly.
      router.replace('/build');
      return;
    }
    setName(draft.result.name);
  }, [draft, router]);

  if (!draft) return null;
  const result = draft.result;

  const onAccept = async () => {
    setError(null);
    try {
      const created = await createPlan.mutateAsync({
        name: name.trim() || 'My path',
        planJson: {
          topics: result.topics.map((t, i) => ({
            stableKey: t.stableKey,
            order: i,
            reason: t.reason,
            area: t.area ?? undefined,
            hops: t.hops,
          })),
        },
        inputJson: {
          turns: [{ text: draft.statement, level: result.level }],
          maxClosureHops: closureDepth,
        },
      });
      clearDraft();
      router.replace(`/(tabs)/lessons?plan=${created.id}`);
    } catch (err) {
      setError(extractError(err));
    }
  };

  /** Re-request rather than filter: dropping hops changes what survives the cap. */
  const onChangeDepth = async (depth: number | null) => {
    setClosureDepth(depth);
    setError(null);
    try {
      updateResult(await rebuild.mutateAsync({ statement: draft.statement, maxClosureHops: depth }));
    } catch (err) {
      setError(extractError(err));
    }
  };

  const onFollowUp = async () => {
    if (followUp.trim().length === 0) return;
    setError(null);
    setNotice(null);
    try {
      const r = await refine.mutateAsync({ statement: followUp, plan: result.topics });
      const previous = result.topics;

      switch (r.action) {
        case 'refine':
          if (r.refusedEmpty === true) {
            setNotice('That would have removed everything, so nothing changed.');
            break;
          }
          updateResult({ ...result, topics: r.plan });
          setLastChange({ removed: r.removed.length, previous });
          setNotice(r.removed.length === 0
            ? 'I couldn’t find anything matching that in your path.'
            : `Removed ${r.removed.length} topic${r.removed.length === 1 ? '' : 's'}.`);
          break;
        case 'replace':
          if (r.rebuilt !== undefined) {
            updateResult(r.rebuilt);
            setName(r.rebuilt.name);
            setLastChange(null);
            setNotice('Rebuilt your path around that instead.');
          }
          break;
        case 'accept':
          await onAccept();
          return;
        case 'restart':
          clearDraft();
          router.replace('/build');
          return;
        case 'reject':
          setNotice('Dropped that path. Tell me what you’re after and I’ll build another.');
          break;
        default:
          setNotice('I’m not sure what to change. Try naming the part you don’t want.');
      }
      setFollowUp('');
    } catch (err) {
      setError(extractError(err));
    }
  };

  const undo = () => {
    if (lastChange === null) return;
    updateResult({ ...result, topics: lastChange.previous });
    setLastChange(null);
    setNotice('Put those back.');
  };

  const chosen = result.topics.filter((t) => t.area !== null).length;
  const groundwork = result.topics.length - chosen;
  const busy = refine.isPending || rebuild.isPending || createPlan.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Your path</Text>

        <Card style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            testID="path-name"
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textMuted}
          />
          <Text testID="plan-counts" style={styles.counts}>
            {chosen} topic{chosen === 1 ? '' : 's'} matched what you asked for
            {groundwork > 0 ? `, plus ${groundwork} that they build on` : ''}.
          </Text>

          <Text style={styles.label}>Groundwork</Text>
          <View style={styles.chips}>
            {CLOSURE_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                testID={`closure-${opt.label}`}
                label={opt.label}
                variant={closureDepth === opt.value ? 'primary' : 'outline'}
                disabled={busy}
                onPress={() => void onChangeDepth(opt.value)}
                style={styles.chip}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          {result.topics.map((t) => (
            <View key={t.stableKey} style={styles.topic}>
              <Text style={styles.topicName}>{t.topicName}</Text>
              <View style={styles.badges}>
                <Badge label={t.level} variant="info" />
                {/* Groundwork is neutral information, not a warning — but the
                    palette has no neutral, so `info` for chosen and `warning`
                    for groundwork keeps them visually distinct. */}
                <Badge
                  label={t.area ?? 'Groundwork'}
                  variant={t.area !== null ? 'success' : 'warning'}
                />
              </View>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Change anything</Text>
          <TextInput
            testID="follow-up"
            style={styles.followUp}
            value={followUp}
            onChangeText={setFollowUp}
            placeholder="e.g. I don’t want the management stuff"
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!busy}
          />
          <Button
            testID="follow-up-submit"
            label={refine.isPending ? 'Updating…' : 'Update my path'}
            variant="outline"
            disabled={busy || followUp.trim().length === 0}
            onPress={() => void onFollowUp()}
          />
          {notice !== null && (
            <Text testID="refine-notice" style={styles.notice}>{notice}</Text>
          )}
          {lastChange !== null && lastChange.removed > 0 && (
            <Button testID="refine-undo" label="Undo" variant="outline" onPress={undo} />
          )}
        </Card>

        {error !== null && (
          <Text testID="review-error" style={styles.error}>{error}</Text>
        )}

        <Button
          testID="accept-plan"
          label={createPlan.isPending ? 'Saving…' : 'Start this path'}
          disabled={busy}
          onPress={() => void onAccept()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  content:   { padding: spacing.lg, gap: spacing.md },
  title:     { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.textDark },
  card:      { gap: spacing.sm },
  label: {
    fontFamily: font.medium, fontSize: fontSize.xs,
    color: colors.textMuted, textTransform: 'uppercase',
  },
  input: {
    fontFamily: font.regular, fontSize: fontSize.md, color: colors.textDark,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
  },
  counts:    { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  chips:     { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip:      { flexGrow: 1 },
  topic:     { gap: spacing.xs, paddingVertical: spacing.xs },
  topicName: { fontFamily: font.medium, fontSize: fontSize.md, color: colors.textDark },
  badges:    { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  followUp: {
    minHeight: 64, fontFamily: font.regular, fontSize: fontSize.sm,
    color: colors.textDark, padding: spacing.sm, borderWidth: 1,
    borderColor: colors.border, borderRadius: 8, textAlignVertical: 'top',
  },
  notice:    { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textDark },
  error:     { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.error },
});
