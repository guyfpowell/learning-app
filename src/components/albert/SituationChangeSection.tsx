import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  ERROR_CODES,
  PATH_END_PROMPT,
  SITUATION_CHANGE_INVITE,
  SITUATION_LOOKING_COPY,
  SITUATION_NOTICE,
  SITUATION_NOTICE_COPY,
  SITUATION_OUTCOME,
  SITUATION_SEND_LABEL,
  TRACK_STATEMENT_MAX,
  isSituationErrorNotice,
  situationNoticeOf,
  type SituationChangeOutcome,
  type SituationNotice,
} from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCreateSituationChange, useLatestSituationChange } from '@/hooks/useSituationChange';
import { errorCode } from '@/lib/errors';
import { PATHS_QUERY_KEY, proposalQueryKey } from '@/lib/queryKeys';

interface Props {
  planId: string;
  /** Premium only: a free user sees the entry, locked (079a). */
  locked: boolean;
  /** The path is finished (079i3): the box asks what they want next, and a silent look says so. */
  pathFinished: boolean;
  onUpgrade: () => void;
}

/** The one message under the box. A finished look is only told about if this screen watched it finish. */
function noticeFor(
  { sendError, loadFailed, watched, outcome, pathFinished }: { sendError: unknown; loadFailed: boolean; watched: boolean; outcome: SituationChangeOutcome | null; pathFinished: boolean },
): SituationNotice | null {
  if (sendError) return errorCode(sendError) === ERROR_CODES.SUBSCRIPTION_INACTIVE ? SITUATION_NOTICE.upgrade : SITUATION_NOTICE.sendError;
  if (loadFailed) return SITUATION_NOTICE.loadError;
  if (!watched || !outcome) return null;
  return situationNoticeOf(outcome, pathFinished);
}

function UpgradeButton({ onPress }: { onPress: () => void }) {
  return <Button testID="situation-change-upgrade" label="Upgrade" variant="outline" onPress={onPress} />;
}

/**
 * "My situation has changed" (079h, ADR-011 Amendment 2): free text to Albert, partway through a custom
 * path, or at its end (079i3), where it is the "what next" box. The server stores the words and runs the look in the background; this sends them, reads the
 * stored outcome while it is `running`, and says what came of it. A proposal is shown by 079g7's card,
 * not here. The words are personal: never logged.
 */
export function SituationChangeSection({ planId, locked, pathFinished, onUpgrade }: Props) {
  const queryClient = useQueryClient();
  const latest = useLatestSituationChange(planId, !locked);
  const create = useCreateSituationChange(planId);
  const [text, setText] = useState('');
  // True once this screen has seen a look under way, so a finished one from before it opened is not replayed.
  const [watched, setWatched] = useState(false);

  const outcome = latest.data?.outcome ?? null;
  // A failed read stops the polling but keeps the last data, so a stale `running` is not still looking.
  const looking = create.isPending || (!latest.isError && outcome === SITUATION_OUTCOME.running);

  useEffect(() => {
    if (outcome === SITUATION_OUTCOME.running) setWatched(true);
  }, [outcome]);

  // Albert came back with a proposal: refetch the paths and this path's suggestion so its card shows.
  useEffect(() => {
    if (!watched || outcome !== SITUATION_OUTCOME.proposal) return;
    setWatched(false);
    void queryClient.invalidateQueries({ queryKey: PATHS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: proposalQueryKey(planId) });
  }, [watched, outcome, planId, queryClient]);

  const invite = pathFinished ? PATH_END_PROMPT : SITUATION_CHANGE_INVITE;

  if (locked) {
    return (
      <Card testID="situation-change-locked" style={styles.card}>
        <Text style={styles.body}>{invite}</Text>
        <UpgradeButton onPress={onUpgrade} />
      </Card>
    );
  }

  const send = () => {
    create.mutate(text.trim(), { onSuccess: () => { setText(''); setWatched(true); } });
  };

  const notice = looking ? null : noticeFor({ sendError: create.error, loadFailed: latest.isError, watched, outcome, pathFinished });

  return (
    <Card testID={`situation-change-${planId}`} style={styles.card}>
      <Text style={styles.body}>{invite}</Text>
      {looking ? (
        <Text testID="situation-change-looking" accessibilityLiveRegion="polite" style={styles.body}>
          {SITUATION_LOOKING_COPY}
        </Text>
      ) : (
        <>
          <TextInput
            testID="situation-change-text"
            style={styles.input}
            value={text}
            onChangeText={setText}
            // Capped in the box, not validated on send, as on the build screen.
            maxLength={TRACK_STATEMENT_MAX}
            accessibilityLabel={invite}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
          <Button testID="situation-change-submit" label={SITUATION_SEND_LABEL} disabled={text.trim().length === 0} onPress={send} />
        </>
      )}
      {notice && (
        <Text accessibilityRole={isSituationErrorNotice(notice) ? 'alert' : undefined} style={isSituationErrorNotice(notice) ? styles.error : styles.body}>
          {SITUATION_NOTICE_COPY[notice]}
        </Text>
      )}
      {notice === SITUATION_NOTICE.upgrade && <UpgradeButton onPress={onUpgrade} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  body: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    color:      colors.textBody,
  },
  error: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
  },
  input: {
    minHeight:    96,
    fontFamily:   font.regular,
    fontSize:     fontSize.md,
    color:        colors.textStrong,
    padding:      spacing.sm,
    borderWidth:  1,
    borderColor:  colors.border,
    borderRadius: radius.input,
  },
});
