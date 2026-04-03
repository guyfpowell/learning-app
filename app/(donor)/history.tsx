import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { TransactionRow } from '@/components/donor/TransactionRow';
import { useInfiniteTransactions } from '@/hooks/useWallet';
import type { Transaction } from '@/types';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

const SKELETON_COUNT = 5;

export default function HistoryScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteTransactions();

  const transactions: Transaction[] =
    data?.pages.flatMap((p) => p.transactions) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function renderSeparator() {
    return <View style={styles.separator} />;
  }

  function renderFooter() {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerSpinner}>
        <Spinner color={colors.teal} />
      </View>
    );
  }

  function renderEmpty() {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No activity yet</Text>
        <Text style={styles.emptySub}>
          Your top-ups, donations, and redemptions will appear here.
        </Text>
      </View>
    );
  }

  function renderItem({ item }: { item: Transaction }) {
    if (item.type === 'RECIPIENT_DONATION') {
      return (
        <Pressable
          testID={`row-${item.id}`}
          onPress={() => router.push({ pathname: '/donation/[id]', params: { id: item.id } })}
          style={({ pressed }) => pressed && styles.rowPressed}
        >
          <TransactionRow transaction={item} />
        </Pressable>
      );
    }
    return (
      <View testID={`row-${item.id}`}>
        <TransactionRow transaction={item} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.heading}>HISTORY</Text>
      </View>

      {/* Skeleton while first page loads */}
      {isLoading ? (
        <Card padding={0} style={styles.card}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <View
              key={i}
              testID="skeleton-row"
              style={[styles.skeletonRow, i < SKELETON_COUNT - 1 && styles.separator]}
            >
              <View style={[styles.shimmer, { width: 8, height: 8, borderRadius: 4 }]} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={[styles.shimmer, { width: 80, height: 12, borderRadius: 4 }]} />
                <View style={[styles.shimmer, { width: 60, height: 10, borderRadius: 4 }]} />
              </View>
              <View style={[styles.shimmer, { width: 60, height: 14, borderRadius: 4 }]} />
            </View>
          ))}
        </Card>
      ) : (
        <FlatList
          testID="flat-list"
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          contentContainerStyle={[
            styles.list,
            transactions.length === 0 && styles.listEmpty,
          ]}
          onRefresh={refetch}
          refreshing={isRefetching}
          style={styles.flatList}
        />
      )}
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
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
    letterSpacing: tracking.heading,
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 8 + spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.bg,
  },
  footerSpinner: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.md,
    color: colors.teal,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  shimmer: {
    backgroundColor: '#E5E7EB',
  },
});
