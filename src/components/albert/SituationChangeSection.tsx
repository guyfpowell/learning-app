import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
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
import { colors, font, fontSize, press, radius, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
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
  // Mid-path the entry is a plain row; tapping it opens the box (the board draws no box).
  const [open, setOpen] = useState(false);

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
      <Box testID="situation-change-locked" finished={pathFinished} invite={invite} locked onPressHead={onUpgrade} headTestID="situation-change-upgrade">
        {pathFinished && <UpgradeButton onPress={onUpgrade} />}
      </Box>
    );
  }

  const send = () => {
    create.mutate(text.trim(), { onSuccess: () => { setText(''); setWatched(true); } });
  };

  const notice = looking ? null : noticeFor({ sendError: create.error, loadFailed: latest.isError, watched, outcome, pathFinished });

  return (
    <Box testID={`situation-change-${planId}`} finished={pathFinished} invite={invite} onPressHead={() => setOpen(o => !o)} headTestID="situation-change-toggle" expanded={open || looking || !!notice}>
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
          <EdgeButton
            testID="situation-change-submit"
            look={{ face: colors.brand, label: colors.onBrand, edge: press.primaryEdge }}
            disabledLook={{ face: colors.border, label: colors.textSubtle }}
            label={SITUATION_SEND_LABEL}
            faceHeight={46}
            disabled={text.trim().length === 0}
            onPress={send}
          />
        </>
      )}
      {notice && (
        <Text accessibilityRole={isSituationErrorNotice(notice) ? 'alert' : undefined} style={isSituationErrorNotice(notice) ? styles.error : styles.body}>
          {SITUATION_NOTICE_COPY[notice]}
        </Text>
      )}
      {notice === SITUATION_NOTICE.upgrade && <UpgradeButton onPress={onUpgrade} />}
    </Box>
  );
}

/**
 * Mid-path (the Albert tab) it sits on the page between two rules, with a tile and the invitation as its
 * heading, and a crown when locked (096); at path end on Home it is still a card.
 */
function Box({ testID, finished, invite, locked = false, onPressHead, headTestID, expanded = true, children }: {
  testID: string;
  finished: boolean;
  invite: string;
  locked?: boolean;
  onPressHead?: () => void;
  headTestID?: string;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  if (finished) {
    return (
      <Card testID={testID} style={styles.card}>
        <Text style={styles.body}>{invite}</Text>
        {children}
      </Card>
    );
  }
  return (
    <View testID={testID} style={styles.plain}>
      <Pressable testID={headTestID} onPress={onPressHead} accessibilityRole="button" accessibilityLabel="My situation has changed" accessibilityState={{ expanded: locked ? undefined : expanded }} style={styles.head}>
        <View style={styles.tile}>
          <Icon name="retake" size={20} color={colors.textStrong} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.invite}>My situation has changed</Text>
          <Text style={styles.inviteSub}>New role or new goal? Albert adjusts.</Text>
        </View>
        {locked && <Icon name="premium" size={20} color={colors.xpEdge} />}
      </Pressable>
      {expanded && children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  plain: { gap: spacing.sm, marginTop: spacing.md, paddingVertical: 16, paddingHorizontal: 2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  head:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tile:  { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 1 },
  invite: { fontFamily: font.extrabold, fontSize: 15, color: colors.textStrong },
  inviteSub: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
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
    minHeight:       96,
    fontFamily:      font.regular,
    fontSize:        fontSize.md,
    color:           colors.textStrong,
    padding:         spacing.sm3,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    radius.md,
  },
});
