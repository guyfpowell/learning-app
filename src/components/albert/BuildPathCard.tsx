import { StyleSheet, Text, View } from 'react-native';
import { ERROR_CODES, ERROR_MESSAGES, FRESH_PATH_TRIAL_NOTE, PATHS_LOAD_ERROR, type AlbertPathActions } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Which build card the Albert tab shows. It keys off the *unfinished* custom path, not the path
 * count (076j): `unfinished` while one is in progress, `complete` when every custom path is
 * finished, `none` when there is no custom path.
 */
export type BuildCardState = 'loading' | 'load-error' | 'unfinished' | 'complete' | 'none';

export interface BuildPathCardProps {
  state: BuildCardState;
  /** Which Albert path actions are offered (shared `albertPathActions`, 079i1); nothing here decides it. */
  actions: AlbertPathActions;
  /** The free allowance is spent: said plainly, next to the upgrade (079a). */
  allowanceSpent: boolean;
  archiveError: string | null;
  onViewMyPath: () => void;
  onCreateNewPath: () => void;
  onBuild: () => void;
}

/** The free user's allowance is spent — said plainly, next to the upgrade (079a). */
function AllowanceUsed() {
  return (
    <Text testID="allowance-used" style={styles.buildBody}>
      {ERROR_MESSAGES[ERROR_CODES.ALBERT_ALLOWANCE_USED]}
    </Text>
  );
}

/** The trial is over: said plainly, where the actions would have been (079i3). */
function TrialOver() {
  return (
    <Text testID="trial-over" style={styles.buildBody}>
      {ERROR_MESSAGES[ERROR_CODES.FRESH_PATH_TRIAL_OVER]}
    </Text>
  );
}

interface BuildButtonSpec {
  testID: string;
  label: string;
  variant: 'primary' | 'outline';
}

/** How building is offered: open, locked behind premium while the trial is open, or not at all once it is over. */
type BuildOffer = 'build' | 'upgrade' | null;

function buildOfferOf(actions: AlbertPathActions): BuildOffer {
  if (actions.canBuild) return 'build';
  return actions.trialOver ? null : 'upgrade';
}

/** The Start / Build another button for whichever build offer is on (nothing when building is closed). */
function BuildButton({ offer, specs, onBuild }: {
  offer: BuildOffer;
  specs: Record<'build' | 'upgrade', BuildButtonSpec>;
  onBuild: () => void;
}) {
  if (offer === null) return null;
  const { testID, label, variant } = specs[offer];
  return <Button testID={testID} label={label} variant={variant} onPress={onBuild} />;
}

/** The allowance-spent line belongs to the upgrade: once the trial is over there is nothing to upgrade to. */
function showsAllowanceUsed({ allowanceSpent, actions }: BuildPathCardProps): boolean {
  return allowanceSpent && buildOfferOf(actions) === 'upgrade';
}

const COMPLETE_BUILD: Record<'build' | 'upgrade', BuildButtonSpec> = {
  build:   { testID: 'build-another', label: 'Build another', variant: 'outline' },
  upgrade: { testID: 'build-another', label: 'Upgrade to build a path', variant: 'outline' },
};

const NO_PATH_BUILD: Record<'build' | 'upgrade', BuildButtonSpec> = {
  build:   { testID: 'build-path-start', label: 'Start', variant: 'primary' },
  upgrade: { testID: 'build-path-upgrade', label: 'Upgrade to build a path', variant: 'outline' },
};

function UnfinishedBody(props: BuildPathCardProps) {
  const { archiveError, actions, onViewMyPath, onCreateNewPath } = props;
  return (
    <>
      <Text style={styles.buildTitle}>Your path is waiting</Text>
      <Text style={styles.buildBody}>
        {actions.canRemove
          ? 'You already have a path in progress. Pick up where you left off, or start fresh — your current path will be removed if you do.'
          : 'You already have a path in progress. Pick up where you left off.'}
      </Text>
      {actions.canRemove && <Text style={styles.buildBody}>{FRESH_PATH_TRIAL_NOTE}</Text>}
      {actions.trialOver && <TrialOver />}
      {showsAllowanceUsed(props) && <AllowanceUsed />}
      {archiveError && (
        <Text testID="albert-archive-error" style={styles.errorText}>
          {archiveError}
        </Text>
      )}
      <Button testID="view-my-path" label="View my path" variant="primary" onPress={onViewMyPath} />
      {actions.canRemove && <Button testID="create-new-path" label="Create a NEW path" variant="outline" onPress={onCreateNewPath} />}
    </>
  );
}

function CompleteBody(props: BuildPathCardProps) {
  const { actions, onViewMyPath, onBuild } = props;
  const offer = buildOfferOf(actions);
  return (
    <>
      <Text style={styles.buildTitle}>You've finished your path</Text>
      <Text style={styles.buildBody}>
        {offer === null
          ? 'Great work — your custom path is complete. View it on your Tracks.'
          : 'Great work — your custom path is complete. View it on your Tracks, or build a new one.'}
      </Text>
      {actions.trialOver && <TrialOver />}
      {showsAllowanceUsed(props) && <AllowanceUsed />}
      <Button testID="view-my-path" label="View my path" variant="primary" onPress={onViewMyPath} />
      <BuildButton offer={offer} specs={COMPLETE_BUILD} onBuild={onBuild} />
    </>
  );
}

function NoPathBody(props: BuildPathCardProps) {
  const { actions, onBuild } = props;
  return (
    <>
      <Text style={styles.buildTitle}>Build my own path</Text>
      <Text style={styles.buildBody}>
        Tell me about your role and what you want to get better at, and I'll
        build a path from the whole curriculum instead of a fixed track.
      </Text>
      {actions.trialOver && <TrialOver />}
      {showsAllowanceUsed(props) && <AllowanceUsed />}
      <BuildButton offer={buildOfferOf(actions)} specs={NO_PATH_BUILD} onBuild={onBuild} />
    </>
  );
}

function CardBody(props: BuildPathCardProps) {
  switch (props.state) {
    // Never flash the no-paths state while the fetch is in flight.
    case 'loading':    return <Spinner />;
    // A failed load is never shown as the no-paths state: it would offer a build the person may not have room for.
    case 'load-error': return <Text testID="paths-load-error" style={styles.errorText}>{PATHS_LOAD_ERROR}</Text>;
    case 'unfinished': return <UnfinishedBody {...props} />;
    case 'complete':   return <CompleteBody {...props} />;
    case 'none':       return <NoPathBody {...props} />;
  }
}

/** Albert's build-a-path card (moved from Tracks): its body follows the user's custom paths. */
export function BuildPathCard(props: BuildPathCardProps) {
  // Premium only while building is offered behind the upgrade; after the trial nothing here is premium.
  const premium = buildOfferOf(props.actions) === 'upgrade';
  return (
    <Card testID="build-path-card" style={styles.buildCard}>
      <View style={styles.badgeRow}>
        <Badge label={premium ? 'Premium' : 'Albert'} variant={premium ? 'warning' : 'info'} />
      </View>
      <CardBody {...props} />
    </Card>
  );
}

const styles = StyleSheet.create({
  buildCard: {
    gap:          spacing.sm,
    borderRadius: radius.xl,
    borderTopWidth: 3,
    borderTopColor: colors.brand,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  buildTitle: {
    fontFamily: font.displayMedium,
    fontSize:   fontSize.lg,
    color:      colors.textStrong,
  },
  buildBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    color:      colors.textMuted,
  },
  errorText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
  },
});
