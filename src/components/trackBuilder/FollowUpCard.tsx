import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { TRACK_STATEMENT_MAX, type BuiltPlan, type BuiltPlanTopic, type RefinePlanRequest, type RefinedPlan } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { extractError } from '@/lib/errors';
import type { TrackBuilderDraft } from '@/store/trackBuilder.store';

interface Props {
  draft: TrackBuilderDraft;
  refinePlan: (request: RefinePlanRequest) => Promise<RefinedPlan>;
  /** A follow-up or the save is under way: the box waits. */
  busy: boolean;
  refining: boolean;
  onPlanChange: (result: BuiltPlan) => void;
  onAccept: () => Promise<void>;
  onRestart: () => void;
  /** The screen's one error line: null clears it. */
  onError: (message: string | null) => void;
}

type LastChange = { removed: number; previous: BuiltPlanTopic[] };

function removedNotice(removed: number): string {
  if (removed === 0) return `I couldn't find anything matching that in your path.`;
  return `Removed ${removed} topic${removed === 1 ? '' : 's'}.`;
}

/**
 * The "change anything" box — 068 Chunk 7d. Intent routing is NOT here: the server returns an
 * `action` and this renders it. The rule that matters, *a control intent must never rebuild the
 * plan*, is the kind that gets lost in a UI; it was lost once already in the 060 harness, where a
 * correctly-detected refinement destroyed the plan.
 */
export function FollowUpCard({ draft, refinePlan, busy, refining, onPlanChange, onAccept, onRestart, onError }: Props) {
  const [followUp, setFollowUp] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<LastChange | null>(null);
  const { result } = draft;

  /** What the server's answer does to the plan. Returns false when the screen has moved on. */
  async function apply(r: RefinedPlan): Promise<boolean> {
    switch (r.action) {
      case 'refine':
        if (r.refusedEmpty === true) {
          setNotice('That would have removed everything, so nothing changed.');
          return true;
        }
        onPlanChange({ ...result, topics: r.plan });
        setLastChange({ removed: r.removed.length, previous: result.topics });
        setNotice(removedNotice(r.removed.length));
        return true;
      case 'replace':
        if (r.rebuilt !== undefined) {
          onPlanChange(r.rebuilt);
          setLastChange(null);
          setNotice('Rebuilt your path around that instead.');
        }
        return true;
      case 'accept':
        await onAccept();
        return false;
      case 'restart':
        onRestart();
        return false;
      case 'reject':
        setNotice(`Dropped that path. Tell me what you're after and I'll build another.`);
        return true;
      default:
        setNotice(`I'm not sure what to change. Try naming the part you don't want.`);
        return true;
    }
  }

  /** Send a follow-up. The server decides what it means; this renders the action it returns. */
  async function send() {
    if (followUp.trim().length === 0) return;
    onError(null);
    setNotice(null);
    try {
      // The requests go with it: a removal is matched against the words the user
      // used for each one, so without them "take out the job stuff" names
      // nothing and comes back as a question instead of being acted on.
      const r = await refinePlan({
        statement: followUp, plan: result.topics, sessionId: draft.sessionId, chunks: result.chunks,
      });
      if (await apply(r)) setFollowUp('');
    } catch (err) {
      onError(extractError(err));
    }
  }

  function undo() {
    if (lastChange === null) return;
    onPlanChange({ ...result, topics: lastChange.previous });
    setLastChange(null);
    setNotice('Put those back.');
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>Change anything</Text>
      <TextInput
        testID="follow-up"
        style={styles.followUp}
        value={followUp}
        onChangeText={setFollowUp}
        maxLength={TRACK_STATEMENT_MAX}
        placeholder="e.g. I don't want the management stuff"
        placeholderTextColor={colors.textMuted}
        multiline
        editable={!busy}
      />
      <Button
        testID="follow-up-submit"
        label={refining ? 'Updating…' : 'Update my path'}
        variant="outline"
        disabled={busy || followUp.trim().length === 0}
        onPress={() => void send()}
      />
      {notice !== null && (
        <Text testID="refine-notice" style={styles.notice}>{notice}</Text>
      )}
      {lastChange !== null && lastChange.removed > 0 && (
        <Button testID="refine-undo" label="Undo" variant="outline" onPress={undo} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card:  { gap: spacing.sm },
  label: {
    fontFamily: font.medium, fontSize: fontSize.xs,
    color: colors.textMuted, textTransform: 'uppercase',
  },
  followUp: {
    minHeight: 64, fontFamily: font.regular, fontSize: fontSize.sm,
    color: colors.textStrong, padding: spacing.sm, borderWidth: 1,
    borderColor: colors.border, borderRadius: 8, textAlignVertical: 'top',
  },
  notice: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textStrong },
});
