import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

interface WalletCardProps {
  balancePence: number;
  onTopUp: () => void;
  onScan: () => void;
}

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function WalletCard({ balancePence, onTopUp, onScan }: WalletCardProps) {
  return (
    <Card style={styles.card}>
      {/* Balance section */}
      <View style={styles.balanceSection}>
        <Text style={styles.label}>WALLET BALANCE</Text>
        <Text style={styles.balance}>{formatPounds(balancePence)}</Text>
        <Text style={styles.sub}>Available to donate</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button label="Top Up" onPress={onTopUp} style={styles.topUpBtn} />
        <Pressable onPress={onScan} style={styles.scanBtn}>
          <Text style={styles.scanText}>Scan to Donate</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export function WalletCardSkeleton() {
  return (
    <Card style={styles.card}>
      <View style={styles.balanceSection}>
        <View style={[styles.shimmer, { width: 100, height: 12, marginBottom: spacing.sm }]} />
        <View style={[styles.shimmer, { width: 160, height: 40, marginBottom: spacing.xs }]} />
        <View style={[styles.shimmer, { width: 120, height: 12 }]} />
      </View>
      <View style={[styles.shimmer, { width: 100, height: 44, borderRadius: 8 }]} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  balanceSection: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.heading,
  },
  balance: {
    fontFamily: font.bold,
    fontSize: 48,
    color: colors.teal,
    lineHeight: 56,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  topUpBtn: {
    flex: 0,
  },
  scanBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  scanText: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.vivid,
    letterSpacing: tracking.heading,
    textTransform: 'uppercase',
  },
  shimmer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
});
