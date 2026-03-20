import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DonationHistoryItem } from '@/types';
import { colors, font, fontSize, spacing } from '@/theme';

interface DonationHistoryRowProps {
  item: DonationHistoryItem;
}

export function DonationHistoryRow({ item }: DonationHistoryRowProps) {
  const router = useRouter();

  const name = item.recipientName ?? 'Vendor donation';
  const amount = `£${(item.amountPence / 100).toFixed(2)}`;
  const date = new Date(item.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  function handlePress() {
    router.push({ pathname: '/donation/[id]', params: { id: item.id } });
  }

  function handleDonateAgain() {
    router.push({
      pathname: '/donate/[id]',
      params: { id: item.recipientId!, displayName: item.recipientName ?? undefined },
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handlePress}
    >
      {/* Left: dot + name + date */}
      <View style={styles.dot} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {/* Right: amount + donate-again + chevron */}
      <Text style={styles.amount}>{amount}</Text>
      {item.recipientId && (
        <Pressable onPress={handleDonateAgain} hitSlop={8} style={styles.donateAgainBtn}>
          <Ionicons name="add-circle-outline" size={20} color={colors.teal} />
        </Pressable>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

/** Shimmer placeholder row shown while the first page loads */
export function DonationHistoryRowSkeleton() {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, styles.shimmer]} />
      <View style={styles.body}>
        <View style={[styles.shimmer, { width: 120, height: 13, borderRadius: 4 }]} />
        <View style={[styles.shimmer, { width: 80, height: 11, borderRadius: 4, marginTop: 4 }]} />
      </View>
      <View style={[styles.shimmer, { width: 50, height: 13, borderRadius: 4, marginRight: spacing.xs }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  rowPressed: {
    backgroundColor: colors.bg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.teal,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textDark,
  },
  date: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  amount: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.teal,
    flexShrink: 0,
  },
  donateAgainBtn: {
    padding: 2,
  },
  shimmer: {
    backgroundColor: '#E5E7EB',
  },
});
