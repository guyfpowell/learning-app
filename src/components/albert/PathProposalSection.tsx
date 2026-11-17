import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
import { ERROR_CODES,
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
  type ProposalStage, NO_SIGNAL_ERROR } from '@learning/shared';
import { colors, font, fontSize, levelCard } from '@/theme';
import { Button } from '@/components/ui/Button';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { RuleButton } from '@/components/albert/RuleButton';
import { useDecideProposal, useProposal } from '@/hooks/useProposal';
import { errorCode } from '@/lib/errors';
import { PAYWALL_ROUTE } from '@/lib/subscriptions';
import { isSignalDrop } from '@/lib/offlineWrites';

const DECIDE_NOTICE = { upgrade: 'upgrade', decideError: 'decide-error', noSignal: 'no-signal' } as const;
type DecideNotice = typeof DECIDE_NOTICE[keyof typeof DECIDE_NOTICE];

/** The error line of each notice that is one; the upgrade notice has its own box. */
const DECIDE_ERROR_COPY: Partial<Record<DecideNotice, string>> = {
  [DECIDE_NOTICE.decideError]: PROPOSAL_DECIDE_ERROR,
  [DECIDE_NOTICE.noSignal]: NO_SIGNAL_ERROR,
};

/** What a failed decision shows. A proposal that moved on shows nothing: the refetch follows the server. */
function noticeFor(err: unknown): DecideNotice | null {
  if (!err || isProposalGone(errorCode(err))) return null;
  if (isSignalDrop(err)) return DECIDE_NOTICE.noSignal;
  return errorCode(err) === ERROR_CODES.SUBSCRIPTION_INACTIVE ? DECIDE_NOTICE.upgrade : DECIDE_NOTICE.decideError;
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
      <View style={styles.button}>
        <RuleButton testID="proposal-decline" label="Decline" disabled={deciding} onPress={() => onDecide('decline')} />
      </View>
      <View style={styles.button}>
        <EdgeButton
          testID="proposal-accept"
          look={{ face: colors.brand, label: colors.onBrand, edge: levelCard.intermediate.edge }}
          label="Accept"
          faceHeight={46}
          disabled={deciding}
          onPress={() => onDecide('accept')}
        />
      </View>
    </View>
  );
}

interface CardProps {
  deciding: boolean;
  onDecide: (d: ProposalDecision) => void;
}

function ChangeCard({ reason, diff, deciding, onDecide }: CardProps & { reason: string; diff: ProposalDiff }) {
  return (
    <View testID="proposal-card" style={styles.card}>
      <Text style={styles.suggestion}>{reason}</Text>
      {proposalDiffLists(diff).map(list => <DiffList key={list.label} label={list.label} items={list.items} />)}
      <DecisionButtons deciding={deciding} onDecide={onDecide} />
    </View>
  );
}

function MoveCard({ move, deciding, onDecide }: CardProps & { move: ProposalMove }) {
  return (
    <View testID="move-card" style={styles.card}>
      <Text style={styles.listLabel}>{moveHeading(move.kind, move.to.title)}</Text>
      <Text style={styles.suggestion}>{move.text}</Text>
      {move.skips.map(t => <Text key={t.key} testID="move-skip" style={styles.listItem}>{t.title}</Text>)}
      <DecisionButtons deciding={deciding} onDecide={onDecide} />
    </View>
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
  const errorLine = notice === null ? undefined : DECIDE_ERROR_COPY[notice];

  const onDecide = (stage: ProposalStage, current: PathProposal, decision: ProposalDecision) => {
    decide.mutate({ proposalId: current.id, stage, decision }, {
      onError: (err) => {
        if (noticeFor(err) === DECIDE_NOTICE.decideError) {
          warnBreadcrumb(BREADCRUMB_CATEGORY.albert, 'Proposal decision failed', err);
        }
      },
    });
  };

  return (
    <View testID={`path-proposal-${path.id}`} style={styles.section}>
      <View style={styles.badgeRow}>
        <AlbertMark size={16} />
        <Text testID="suggestion-badge" style={styles.eyebrow}>{SUGGESTION_BADGE_TEXT.toUpperCase()}</Text>
      </View>
      {proposalQuery.isError && <Text testID="proposal-load-error" style={styles.error}>{PROPOSAL_LOAD_ERROR}</Text>}
      {errorLine !== undefined && <Text style={styles.error}>{errorLine}</Text>}
      {notice === DECIDE_NOTICE.upgrade && (
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
  // On the page, split from what is above by a rule, not in a card (Albert, option A).
  section:   { gap: 12, paddingTop: 18, paddingBottom: 20, paddingHorizontal: 2, borderTopWidth: 1, borderTopColor: colors.border },
  badgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow:   { flex: 1, fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.08 * 12, color: colors.brand },
  card:      { gap: 12 },
  buttons:   { flexDirection: 'row', gap: 10 },
  button:    { flex: 1 },
  upgrade:   { gap: 8 },
  // The suggestion is the largest type on the screen.
  suggestion: {
    fontFamily:    font.extrabold,
    fontSize:      22,
    lineHeight:    22 * 1.22,
    letterSpacing: -0.025 * 22,
    color:         colors.textStrong,
  },
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
