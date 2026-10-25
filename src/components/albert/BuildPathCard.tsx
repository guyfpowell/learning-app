import { StyleSheet, Text, View } from 'react-native';
import { ERROR_CODES, ERROR_MESSAGES, PATHS_LOAD_ERROR } from '@learning/shared';
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
  /** A free user who has spent their one saved path, or a user who failed to load: building is gated. */
  locked: boolean;
  /** The free allowance is spent: say so plainly, next to the locked action (079a). */
  allowanceSpent: boolean;
  archiveError: string | null;
  onViewMyPath: () => void;
  onCreateNewPath: () => void;
  onBuild: () => void;
}

/** The free user's allowance is spent — said plainly, next to the locked action (079a). */
function AllowanceUsed() {
  return (
    <Text testID="allowance-used" style={styles.buildBody}>
      {ERROR_MESSAGES[ERROR_CODES.ALBERT_ALLOWANCE_USED]}
    </Text>
  );
}

function UnfinishedBody({ allowanceSpent, archiveError, onViewMyPath, onCreateNewPath }: BuildPathCardProps) {
  return (
    <>
      <Text style={styles.buildTitle}>Your path is waiting</Text>
      <Text style={styles.buildBody}>
        You already have a path in progress. Pick up where you left off, or start
        fresh — your current path will be removed if you do.
      </Text>
      {allowanceSpent && <AllowanceUsed />}
      {archiveError && (
        <Text testID="albert-archive-error" style={styles.errorText}>
          {archiveError}
        </Text>
      )}
      <Button testID="view-my-path" label="View my path" variant="primary" onPress={onViewMyPath} />
      <Button testID="create-new-path" label="Create a NEW path" variant="outline" onPress={onCreateNewPath} />
    </>
  );
}

function CompleteBody({ locked, allowanceSpent, onViewMyPath, onBuild }: BuildPathCardProps) {
  return (
    <>
      <Text style={styles.buildTitle}>You've finished your path</Text>
      <Text style={styles.buildBody}>
        Great work — your custom path is complete. View it on your Tracks, or
        build a new one.
      </Text>
      {allowanceSpent && <AllowanceUsed />}
      <Button testID="view-my-path" label="View my path" variant="primary" onPress={onViewMyPath} />
      <Button
        testID="build-another"
        label={locked ? 'Upgrade to build a path' : 'Build another'}
        variant="outline"
        onPress={onBuild}
      />
    </>
  );
}

function NoPathBody({ locked, allowanceSpent, onBuild }: BuildPathCardProps) {
  return (
    <>
      <Text style={styles.buildTitle}>Build my own path</Text>
      <Text style={styles.buildBody}>
        Tell me about your role and what you want to get better at, and I'll
        build a path from the whole curriculum instead of a fixed track.
      </Text>
      {allowanceSpent && <AllowanceUsed />}
      <Button
        testID={locked ? 'build-path-upgrade' : 'build-path-start'}
        label={locked ? 'Upgrade to build a path' : 'Start'}
        variant={locked ? 'outline' : 'primary'}
        onPress={onBuild}
      />
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
  return (
    <Card testID="build-path-card" style={styles.buildCard}>
      <View style={styles.badgeRow}>
        <Badge label={props.locked ? 'Premium' : 'Albert'} variant={props.locked ? 'warning' : 'info'} />
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
