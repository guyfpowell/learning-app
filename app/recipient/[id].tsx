import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useRecipientProfile } from '@/hooks/useRecipient';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

export default function RecipientScreen() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const router = useRouter();

  const { data: profile, isLoading, error } = useRecipientProfile(id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centred}>
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centred}>
          <Text style={styles.errorText}>Could not load recipient profile.</Text>
          <Button label="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isSuspended = profile.status === 'SUSPENDED';

  function handleDonate() {
    router.push({
      pathname: '/donate/[id]',
      params: { id, token, displayName: profile!.displayName },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={colors.teal} />
        </Pressable>
        <Text style={styles.navTitle}>RECIPIENT</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card — name + status */}
        <Card style={styles.heroCard}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={isSuspended ? 'Suspended' : 'Active'}
              variant={isSuspended ? 'warning' : 'success'}
            />
          </View>
        </Card>

        {/* Stats row */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                £{(profile.totalRaisedPence / 100).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Total raised</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.donorCount}</Text>
              <Text style={styles.statLabel}>Donors</Text>
            </View>
          </View>
        </Card>

        {/* Recent activity */}
        {profile.recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT DONATIONS</Text>
            <Card padding={0}>
              {profile.recentActivity.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.activityRow,
                    i < profile.recentActivity.length - 1 &&
                      styles.activityBorder,
                  ]}
                >
                  <Text style={styles.activityDate}>
                    {new Date(item.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.activityAmount}>
                    +£{(item.amountPence / 100).toFixed(2)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Donate / suspended notice */}
        {isSuspended ? (
          <Card style={styles.suspendedCard}>
            <Text style={styles.suspendedText}>
              This recipient is currently suspended and cannot receive donations.
            </Text>
          </Card>
        ) : (
          <Button
            label="Donate"
            onPress={handleDonate}
            style={styles.donateBtn}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.teal,
    letterSpacing: tracking.heading,
  },
  navSpacer: {
    width: 38,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  displayName: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.teal,
    lineHeight: 30,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  statsCard: {
    paddingVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
  },
  statLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.tight,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.heading,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityDate: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  activityAmount: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  donateBtn: {
    marginTop: spacing.xs,
  },
  suspendedCard: {
    backgroundColor: '#FEF9C3',
    marginTop: spacing.xs,
  },
  suspendedText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: '#A16207',
    lineHeight: 20,
    textAlign: 'center',
  },
});
