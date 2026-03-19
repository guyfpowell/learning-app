import { StyleSheet, Text, View } from 'react-native';
import type { Transaction } from '@/types';
import { colors, font, fontSize, spacing } from '@/theme';

const TYPE_LABELS: Record<Transaction['type'], string> = {
  WALLET_TOPUP: 'Top Up',
  RECIPIENT_DONATION: 'Donation',
  RECIPIENT_DEBIT: 'Redemption',
};

interface TransactionRowProps {
  transaction: Transaction;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(transaction: Transaction): { text: string; positive: boolean } {
  const positive = transaction.type !== 'RECIPIENT_DONATION';
  const pounds = (transaction.amount / 100).toFixed(2);
  return { text: `${positive ? '+' : '−'}£${pounds}`, positive };
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const { text, positive } = formatAmount(transaction);

  return (
    <View style={styles.row}>
      <View style={[styles.dot, positive ? styles.dotCredit : styles.dotDebit]} />
      <View style={styles.info}>
        <Text style={styles.type}>{TYPE_LABELS[transaction.type]}</Text>
        <Text style={styles.date}>{formatDate(transaction.createdAt)}</Text>
      </View>
      <Text style={[styles.amount, positive ? styles.amountCredit : styles.amountDebit]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCredit: {
    backgroundColor: colors.success,
  },
  dotDebit: {
    backgroundColor: colors.error,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  type: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.teal,
  },
  date: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  amount: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
  },
  amountCredit: {
    color: colors.success,
  },
  amountDebit: {
    color: colors.error,
  },
});
