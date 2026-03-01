import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { RedemptionRow } from '@/components/donor/RedemptionRow';
import { useSpendBreakdown } from '@/hooks/useDonation';
import { colors, font, fontSize, radius, spacing, tracking } from '@/theme';

export default function DonationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, error, refetch } = useSpendBreakdown(id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <NavBar onBack={() => router.back()} />
        <View style={styles.centred}>
          <Spinner />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <NavBar onBack={() => router.back()} />
        <View style={styles.centred}>
          <Text style={styles.errorText}>Could not load donation details.</Text>
          <Button label="Retry" onPress={refetch} />
        </View>
      </SafeAreaView>
    );
  }

  const spentFraction = data.totalPence > 0
    ? Math.min(data.spentPence / data.totalPence, 1)
    : 0;
  const fullySpent = data.remainingPence === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <NavBar onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.totalAmount}>
            £{(data.totalPence / 100).toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>donated</Text>
          <Badge
            label={fullySpent ? 'Fully spent' : 'In progress'}
            variant={fullySpent ? 'success' : 'info'}
          />
        </Card>

        {/* Progress bar card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>SPENT</Text>
            <Text style={styles.progressLabel}>TOTAL</Text>
          </View>
          <View style={styles.progressAmounts}>
            <Text style={styles.spentAmount}>
              £{(data.spentPence / 100).toFixed(2)}
            </Text>
            <Text style={styles.totalAmountSmall}>
              of £{(data.totalPence / 100).toFixed(2)}
            </Text>
          </View>

          {/* Bar track */}
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${spentFraction * 100}%` as any },
              ]}
            />
          </View>

          {data.remainingPence > 0 && (
            <Text style={styles.remaining}>
              £{(data.remainingPence / 100).toFixed(2)} remaining to be spent
            </Text>
          )}
        </Card>

        {/* Redemptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOW IT WAS SPENT</Text>

          {data.redemptions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Not yet spent</Text>
              <Text style={styles.emptySub}>
                The recipient will spend this at a partner vendor. Check back soon.
              </Text>
            </Card>
          ) : (
            <Card padding={0} style={styles.redemptionsCard}>
              {data.redemptions.map((r, i) => (
                <RedemptionRow
                  key={i}
                  redemption={r}
                  last={i === data.redemptions.length - 1}
                />
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NavBar({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.navBar}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="arrow-back" size={22} color={colors.teal} />
      </Pressable>
      <Text style={styles.navTitle}>DONATION DETAIL</Text>
      <View style={styles.navSpacer} />
    </View>
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
  // Summary
  summaryCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  totalAmount: {
    fontFamily: font.bold,
    fontSize: 40,
    color: colors.teal,
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  // Progress
  progressCard: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.heading,
  },
  progressAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  spentAmount: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
  },
  totalAmountSmall: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  barTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
    minWidth: 4,
  },
  remaining: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
  // Redemptions
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.heading,
  },
  redemptionsCard: {
    overflow: 'hidden',
  },
  emptyCard: {
    gap: spacing.xs,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.teal,
  },
  emptySub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
