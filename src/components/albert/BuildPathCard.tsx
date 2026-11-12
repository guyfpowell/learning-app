import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ERROR_CODES, ERROR_MESSAGES, FRESH_PATH_TRIAL_NOTE, PATHS_LOAD_ERROR, type AlbertPathActions, type UserPath } from '@learning/shared';
import { colors, font, fontSize, levelCard, radius, spacing } from '@/theme';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { LevelHero } from '@/components/home/LevelHero';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { flooredPct } from '@/components/ui/PathCard';
import { RuleButton } from '@/components/albert/RuleButton';

/**
 * Which build card the Albert tab shows. It keys off the *unfinished* custom path, not the path
 * count (076j): `unfinished` while one is in progress, `complete` when every custom path is
 * finished, `none` when there is no custom path.
 */
export type BuildCardState = 'loading' | 'load-error' | 'unfinished' | 'complete' | 'none';

export interface BuildPathCardProps {
  state: BuildCardState;
  /** The path to show (the one in progress, else the finished one); null with no custom path. */
  path: UserPath | null;
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
function AllowanceUsed({ onCard = false }: { onCard?: boolean }) {
  return (
    <Text testID="allowance-used" style={[styles.buildBody, onCard && styles.onCard]}>
      {ERROR_MESSAGES[ERROR_CODES.ALBERT_ALLOWANCE_USED]}
    </Text>
  );
}

/** The trial is over: said plainly, where the actions would have been (079i3). */
function TrialOver({ onCard = false }: { onCard?: boolean }) {
  return (
    <Text testID="trial-over" style={[styles.buildBody, onCard && styles.onCard]}>
      {ERROR_MESSAGES[ERROR_CODES.FRESH_PATH_TRIAL_OVER]}
    </Text>
  );
}

interface BuildButtonSpec {
  testID: string;
  label: string;
  variant: 'primary' | 'outline';
}

/** The person's path: its name, how far along, and what is next (096). Opened by the button under it. */
function PathInfo({ path }: { path: UserPath }) {
  const pct = flooredPct(path);
  return (
    <View testID="path-info" style={styles.pathInfo}>
      <Text style={styles.pathName} numberOfLines={2}>{path.name}</Text>
      <View style={styles.pathBarBlock}>
        <View style={styles.pathTrack}>
          <View style={[styles.pathFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.pathCounts}>
          <Text style={styles.pathLessons}>{path.completedLessons} of {path.totalLessons} lessons</Text>
          <Text style={styles.pathPct}>{pct}%</Text>
        </View>
      </View>
      {path.nextLesson && (
        <Text style={styles.pathNext} numberOfLines={1}>Next: {path.nextLesson.title}</Text>
      )}
    </View>
  );
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
  build:   { testID: 'build-another', label: 'Build another', variant: 'primary' },
  upgrade: { testID: 'build-another', label: 'Upgrade to build a path', variant: 'outline' },
};

const NO_PATH_BUILD: Record<'build' | 'upgrade', BuildButtonSpec> = {
  build:   { testID: 'build-path-start', label: 'Tell Albert about you', variant: 'primary' },
  upgrade: { testID: 'build-path-upgrade', label: 'Upgrade to build a path', variant: 'outline' },
};

function UnfinishedBody(props: BuildPathCardProps) {
  const { archiveError, actions, onViewMyPath, onCreateNewPath } = props;
  return (
    <>
      <Text style={styles.heading}>Your path</Text>
      {props.path && <PathInfo path={props.path} />}
      {actions.trialOver && <TrialOver />}
      {showsAllowanceUsed(props) && <AllowanceUsed />}
      {archiveError && (
        <Text testID="albert-archive-error" style={styles.errorText}>
          {archiveError}
        </Text>
      )}
      <View style={styles.pathActions}>
        <View style={styles.pathOpen}>
          <RuleButton testID="view-my-path" label="View my path" height={48} onPress={onViewMyPath} />
        </View>
        {/* Starting again removes this path, so it is a quiet link, not a button (096). */}
        {actions.canRemove && (
          <Pressable testID="create-new-path" onPress={onCreateNewPath} accessibilityRole="button" accessibilityLabel="Create a new path" hitSlop={8}>
            <Text style={styles.newPathLink}>New path</Text>
          </Pressable>
        )}
      </View>
      {actions.canRemove && <Text style={styles.buildBody}>{FRESH_PATH_TRIAL_NOTE}</Text>}
    </>
  );
}

function CompleteBody(props: BuildPathCardProps) {
  const { actions, onViewMyPath, onBuild } = props;
  const offer = buildOfferOf(actions);
  return (
    <>
      <Text style={styles.heading}>Your path</Text>
      {props.path && <PathInfo path={props.path} />}
      <Text style={styles.buildBody}>
        {offer === null
          ? 'Great work. Your custom path is complete. View it on your Tracks.'
          : 'Great work. Your custom path is complete. View it on your Tracks, or build a new one.'}
      </Text>
      {actions.trialOver && <TrialOver />}
      {showsAllowanceUsed(props) && <AllowanceUsed />}
      <RuleButton testID="view-my-path" label="View my path" height={48} onPress={onViewMyPath} />
      <BuildButton offer={offer} specs={COMPLETE_BUILD} onBuild={onBuild} />
    </>
  );
}

function NoPathBody(props: BuildPathCardProps) {
  const { actions, onBuild } = props;
  const offer = buildOfferOf(actions);
  return (
    <>
      <Text style={styles.cardTitle}>Build my own path</Text>
      <Text style={[styles.buildBody, styles.onCard]}>Tell me your role and what you want to get better at.</Text>
      {actions.trialOver && <TrialOver onCard />}
      {showsAllowanceUsed(props) && <AllowanceUsed onCard />}
      {offer !== null && (
        <View style={styles.cardButton}>
          <EdgeButton
            testID={NO_PATH_BUILD[offer].testID}
            look={{ face: colors.white, label: colors.brand, edge: levelCard.intermediate.edge }}
            label={NO_PATH_BUILD[offer].label}
            onPress={onBuild}
          />
        </View>
      )}
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
  // Building a path is the page's one cobalt card, a touch wider than the page's gutters like Home's.
  if (props.state === 'none') {
    return (
      <LevelHero level="intermediate" testID="build-path-card" padding={CARD_PADDING} style={styles.heroBleed}>
        {premium && (
          <View style={styles.badgeRow}>
            <Badge label="Premium" variant="warning" />
          </View>
        )}
        <CardBody {...props} />
      </LevelHero>
    );
  }
  return (
    <View testID="build-path-card" style={styles.buildCard}>
      {premium && (
        <View style={styles.badgeRow}>
          <Badge label="Premium" variant="warning" />
        </View>
      )}
      <CardBody {...props} />
    </View>
  );
}

const CARD_PADDING = 20;

const styles = StyleSheet.create({
  // The page pads 24; the card sits 16 in from the edge, as Home's does.
  heroBleed: { marginHorizontal: -spacing.sm },
  cardTitle: {
    fontFamily:    font.black,
    fontSize:      fontSize.lg,
    letterSpacing: -0.03 * fontSize.lg,
    color:         colors.onBrand,
  },
  onCard:     { color: colors.brandSoft },
  cardButton: { marginTop: spacing.xs },
  // On the page, not a card: a rule above, the section's content stacked under it.
  buildCard: { gap: 12, paddingTop: 18, paddingHorizontal: 2, paddingBottom: 4, borderTopWidth: 1, borderTopColor: colors.border },
  heading: {
    fontFamily:    font.extrabold,
    fontSize:      12,
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 12,
  },
  pathInfo: { gap: 12 },
  pathName: { fontFamily: font.black, fontSize: 20, letterSpacing: -0.025 * 20, color: colors.textStrong },
  pathBarBlock: { gap: 7 },
  pathTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  pathFill:  { height: '100%', borderRadius: radius.pill, backgroundColor: colors.brand },
  pathCounts: { flexDirection: 'row', justifyContent: 'space-between' },
  pathLessons: { fontFamily: font.bold, fontSize: 13, color: colors.textBody },
  pathPct:   { fontFamily: font.bold, fontSize: 13, color: colors.brand },
  pathNext:  { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  pathActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pathOpen:  { flex: 1 },
  newPathLink: { fontFamily: font.bold, fontSize: 14, color: colors.textMuted, paddingHorizontal: 6 },
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
