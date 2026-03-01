import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import type { SpendRedemption } from '@/types';
import { colors, font, fontSize, spacing } from '@/theme';

interface RedemptionRowProps {
  redemption: SpendRedemption;
  /** Omit the bottom border on the last row */
  last?: boolean;
}

export function RedemptionRow({ redemption, last }: RedemptionRowProps) {
  const date = new Date(redemption.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.body}>
        <Text style={styles.vendor}>{redemption.vendorName}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>
          £{(redemption.amountPence / 100).toFixed(2)}
        </Text>
        <Badge
          label={redemption.partial ? 'Partial' : 'Spent'}
          variant={redemption.partial ? 'warning' : 'success'}
        />
      </View>
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
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  vendor: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textDark,
  },
  date: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
  },
  amount: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.teal,
  },
});
