import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLogout } from '@/hooks/useAuth';
import { useRecipientSelfProfile } from '@/hooks/useRecipientSelf';
import { colors, font, fontSize, spacing, tracking } from '@/theme';

function formatShortCode(code: string): string {
  const clean = code.replace(/-/g, '');
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
}

export default function RecipientHomeScreen() {
  const router = useRouter();
  const { data: profile, isLoading, refetch } = useRecipientSelfProfile();
  const logout = useLogout();

  const displayName = profile?.nickname ?? profile?.firstName ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.teal}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hello{displayName ? `, ${displayName}` : ''}
          </Text>
          <Text style={styles.headingLabel}>YOUR ACCOUNT</Text>
        </View>

        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          {isLoading ? (
            <View style={styles.balanceSkeleton} />
          ) : (
            <Text style={styles.balanceAmount}>
              £{((profile?.balance ?? 0) / 100).toFixed(2)}
            </Text>
          )}
          {profile && (
            <Text style={styles.shortCodeHint}>
              Code: {formatShortCode(profile.shortCode)}
            </Text>
          )}
        </Card>

        <View style={styles.quickLinks}>
          <Pressable onPress={() => router.push('/(recipient)/lanyard')}>
            <Card style={styles.quickLinkCard}>
              <Text style={styles.quickLinkTitle}>My Card</Text>
              <Text style={styles.quickLinkSub}>Show QR code to receive donations</Text>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/(recipient)/history')}>
            <Card style={styles.quickLinkCard}>
              <Text style={styles.quickLinkTitle}>History</Text>
              <Text style={styles.quickLinkSub}>View donations and spending</Text>
            </Card>
          </Pressable>
        </View>

        <Button
          label="Log out"
          variant="outline"
          onPress={() => logout.mutate()}
          loading={logout.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  greeting: {
    fontFamily: font.semiBold,
    fontSize: fontSize.lg,
    color: colors.teal,
  },
  headingLabel: {
    fontFamily: font.bold,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: tracking.heading,
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  balanceLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  balanceAmount: {
    fontFamily: font.bold,
    fontSize: 48,
    color: colors.teal,
  },
  balanceSkeleton: {
    height: 56,
    width: 160,
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  shortCodeHint: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  quickLinks: {
    gap: spacing.md,
  },
  quickLinkCard: {
    gap: spacing.xs,
  },
  quickLinkTitle: {
    fontFamily: font.semiBold,
    fontSize: fontSize.base,
    color: colors.teal,
  },
  quickLinkSub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
