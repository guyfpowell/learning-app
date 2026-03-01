import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletCard, WalletCardSkeleton } from '@/components/donor/WalletCard';
import { TopUpSheet } from '@/components/donor/TopUpSheet';
import { TransactionRow } from '@/components/donor/TransactionRow';
import { Card } from '@/components/ui/Card';
import { useWalletBalance, useTransactions } from '@/hooks/useWallet';
import { useAuthStore } from '@/store/auth.store';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

const RECENT_LIMIT = 3;

export default function DashboardScreen() {
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);

  const user = useAuthStore((s) => s.user);
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useWalletBalance();
  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useTransactions(1, RECENT_LIMIT);

  function handleRefresh() {
    refetchWallet();
    refetchTx();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={walletLoading || txLoading}
            onRefresh={handleRefresh}
            tintColor={colors.teal}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hello{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </Text>
          <Text style={styles.headingLabel}>DASHBOARD</Text>
        </View>

        {walletLoading ? (
          <WalletCardSkeleton />
        ) : (
          <WalletCard
            balancePence={wallet?.walletBalance ?? 0}
            onTopUp={() => sheetRef.current?.expand()}
            onScan={() => router.push('/(donor)/scan')}
          />
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            <Pressable onPress={() => router.push('/(donor)/history')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          <Card padding={0} style={styles.txCard}>
            {txLoading && (
              <View style={styles.txPad}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.shimmerRow, i < 2 && styles.shimmerBorder]}>
                    <View style={[styles.shimmer, { width: 8, height: 8, borderRadius: 4 }]} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={[styles.shimmer, { width: 80, height: 12 }]} />
                      <View style={[styles.shimmer, { width: 60, height: 10 }]} />
                    </View>
                    <View style={[styles.shimmer, { width: 60, height: 14 }]} />
                  </View>
                ))}
              </View>
            )}

            {!txLoading && txData?.transactions.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            )}

            {!txLoading && txData && txData.transactions.length > 0 && (
              <View style={styles.txPad}>
                {txData.transactions.map((tx, i) => (
                  <View
                    key={tx.id}
                    style={i < txData.transactions.length - 1 && styles.txBorder}
                  >
                    <TransactionRow transaction={tx} />
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      <TopUpSheet sheetRef={sheetRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  header: { gap: spacing.xs },
  greeting: {
    fontFamily: font.regular,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  headingLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
    letterSpacing: tracking.heading,
  },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.heading,
  },
  seeAll: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.vivid,
    letterSpacing: tracking.heading,
    textTransform: 'uppercase',
  },
  txCard: { overflow: 'hidden' },
  txPad: { paddingHorizontal: spacing.md },
  txBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  shimmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  shimmerBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  shimmer: { backgroundColor: '#E5E7EB', borderRadius: 4 },
});
