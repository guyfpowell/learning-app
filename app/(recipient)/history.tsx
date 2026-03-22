import { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spinner } from '@/components/ui/Spinner';
import { useRecipientSelfTransactions } from '@/hooks/useRecipientSelf';
import type { RecipientTransaction } from '@/types';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortCode(code: string): string {
  const clean = code.replace(/-/g, '');
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
}

function TransactionRow({ item }: { item: RecipientTransaction }) {
  const isDonation = item.type === 'RECIPIENT_DONATION';
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowType}>{isDonation ? 'Donation received' : 'Spent at vendor'}</Text>
        <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
        {item.lineItems.length > 0 && (
          <Text style={styles.rowItems} numberOfLines={1}>
            {item.lineItems.map((li) => `${li.name} ×${li.quantity}`).join(', ')}
          </Text>
        )}
      </View>
      <Text style={[styles.rowAmount, isDonation ? styles.amountIn : styles.amountOut]}>
        {isDonation ? '+' : '-'}£{(item.amount / 100).toFixed(2)}
      </Text>
    </View>
  );
}

const SKELETON_COUNT = 5;

export default function RecipientHistoryScreen() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useRecipientSelfTransactions();

  const transactions: RecipientTransaction[] =
    data?.pages.flatMap((p) => p.data) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function renderFooter() {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerSpinner}>
        <Spinner color={colors.teal} />
      </View>
    );
  }

  function renderEmpty() {
    if (isLoading) {
      return (
        <View style={styles.skeletons}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <View key={i} style={styles.skeletonRow} />
          ))}
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No transactions yet.</Text>
        <Text style={styles.emptyHint}>Donations you receive and spending will appear here.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headingLabel}>HISTORY</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={colors.teal}
          />
        }
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headingLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textDarkMuted,
    letterSpacing: tracking.heading,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowType: {
    fontFamily: font.semiBold,
    fontSize: fontSize.sm,
    color: colors.textDark,
  },
  rowDate: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textDarkMuted,
  },
  rowItems: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textDarkMuted,
    marginTop: 2,
  },
  rowAmount: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    marginLeft: spacing.md,
  },
  amountIn: {
    color: '#16a34a',
  },
  amountOut: {
    color: colors.error,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  footerSpinner: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  skeletons: {
    gap: 1,
  },
  skeletonRow: {
    height: 64,
    backgroundColor: '#f0f0f0',
    marginBottom: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: font.semiBold,
    fontSize: fontSize.base,
    color: colors.textDark,
  },
  emptyHint: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textDarkMuted,
    textAlign: 'center',
  },
});
