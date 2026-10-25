import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import {
  ERROR_CODES,
  PROPOSAL_DECIDE_ERROR,
  PROPOSAL_LOAD_ERROR,
  PROPOSAL_UPGRADE_COPY,
  SUGGESTION_BADGE_TEXT,
  dueCard,
  isProposalGone,
  moveHeading,
  proposalDiffLists,
  type CustomPath,
  type PathProposal,
  type ProposalDecision,
  type ProposalDiff,
  type ProposalMove,
  type ProposalStage,
} from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDecideProposal, useProposal } from '@/hooks/useProposal';
import { errorCode } from '@/lib/errors';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';

type DecideNotice = 'upgrade' | 'decide-error' | null;

/** What a failed decision shows. A proposal that moved on shows nothing: the refetch follows the server. */
function noticeFor(err: unknown): DecideNotice {
  if (!err || isProposalGone(errorCode(err))) return null;
  return errorCode(err) === ERROR_CODES.SUBSCRIPTION_INACTIVE ? 'upgrade' : 'decide-error';
}

function DiffList({ label, items }: { label: string; items: string[] }) {
  return (
    <View>
      <Text style={styles.listLabel}>{label}</Text>
      {items.map(item => <Text key={item} style={styles.listItem}>{item}</Text>)}
    </View>
  );
}

function DecisionButtons({ deciding, onDecide }: { deciding: boolean; onDecide: (d: ProposalDecision) => void }) {
  return (
    <View style={styles.buttons}>
      <Button testID="proposal-accept" label="Accept" disabled={deciding} onPress={() => onDecide('accept')} />
      <Button testID="proposal-decline" label="Decline" variant="outline" disabled={deciding} onPress={() => onDecide('decline')} />
    </View>
  );
}

interface CardProps {
  deciding: boolean;
  onDecide: (d: ProposalDecision) => void;
}

function ChangeCard({ reason, diff, deciding, onDecide }: CardProps & { reason: string; diff: ProposalDiff }) {
  return (
    <Card testID="proposal-card" style={styles.card}>
      <Text style={styles.body}>{reason}</Text>
      {proposalDiffLists(diff).map(list => <DiffList key={list.label} label={list.label} items={list.items} />)}
      <DecisionButtons deciding={deciding} onDecide={onDecide} />
    </Card>
  );
}

function MoveCard({ move, deciding, onDecide }: CardProps & { move: ProposalMove }) {
  return (
    <Card testID="move-card" style={styles.card}>
      <Text style={styles.listLabel}>{moveHeading(move.kind, move.to.title)}</Text>
      <Text style={styles.body}>{move.text}</Text>
      {move.skips.map(t => <Text key={t.key} testID="move-skip" style={styles.listItem}>{t.title}</Text>)}
      <DecisionButtons deciding={deciding} onDecide={onDecide} />
    </Card>
  );
}

/**
 * Albert's suggestion for one custom path (079g7, ADR-011 Amendment 2): the badge, then the card that
 * is due. The server derives the diff, the move text and which card comes next; this renders them and
 * never works any of it out. Not a push: nothing here interrupts or blocks.
 */
export function PathProposalSection({ path }: { path: CustomPath }) {
  const router = useRouter();
  const proposalQuery = useProposal(path.id, path.hasProposal);
  const decide = useDecideProposal(path.id);

  if (!path.hasProposal) return null;
  // Loaded and nothing pending: no badge without a card under it.
  if (proposalQuery.isSuccess && !proposalQuery.data) return null;

  const proposal = proposalQuery.data ?? null;
  const due = proposal ? dueCard(proposal) : null;
  const notice = noticeFor(decide.error);

  const onDecide = (stage: ProposalStage, current: PathProposal, decision: ProposalDecision) => {
    decide.mutate({ proposalId: current.id, stage, decision }, {
      onError: (err) => {
        if (noticeFor(err) === 'decide-error') {
          Sentry.addBreadcrumb({ category: 'albert', message: 'Proposal decision failed', level: 'warning', data: { err: String(err) } });
        }
      },
    });
  };

  return (
    <View testID={`path-proposal-${path.id}`} style={styles.section}>
      <View style={styles.badgeRow}>
        <Badge label={SUGGESTION_BADGE_TEXT} variant="info" />
      </View>
      {proposalQuery.isError && <Text testID="proposal-load-error" style={styles.error}>{PROPOSAL_LOAD_ERROR}</Text>}
      {notice === 'decide-error' && <Text style={styles.error}>{PROPOSAL_DECIDE_ERROR}</Text>}
      {notice === 'upgrade' && (
        <View style={styles.upgrade}>
          <Text style={styles.body}>{PROPOSAL_UPGRADE_COPY}</Text>
          <Button testID="proposal-upgrade" label="Upgrade" variant="outline" onPress={() => router.push(PAYWALL_ROUTE)} />
        </View>
      )}
      {proposal && due?.stage === 'change' && (
        <ChangeCard reason={proposal.reason} diff={due.diff} deciding={decide.isPending} onDecide={d => onDecide('change', proposal, d)} />
      )}
      {proposal && due?.stage === 'move' && (
        <MoveCard move={due.move} deciding={decide.isPending} onDecide={d => onDecide('move', proposal, d)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section:   { gap: spacing.sm, marginBottom: spacing.lg },
  badgeRow:  { flexDirection: 'row', flexWrap: 'wrap' },
  card:      { gap: spacing.sm },
  buttons:   { gap: spacing.xs },
  upgrade:   { gap: spacing.xs },
  body: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    color:      colors.textBody,
  },
  listLabel: {
    fontFamily: font.semibold,
    fontSize:   fontSize.sm,
    color:      colors.textStrong,
  },
  listItem: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
  },
  error: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
  },
});
