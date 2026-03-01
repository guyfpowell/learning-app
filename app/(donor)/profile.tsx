import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useLogout } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/auth.store';
import { colors, font, fontSize, radius, spacing, tracking } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: profile, isLoading } = useProfile();

  const initials = (user?.email ?? '?')[0].toUpperCase();

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const totalDonated =
    profile?.totalDonatedPence !== undefined
      ? `£${(profile.totalDonatedPence / 100).toFixed(2)}`
      : null;

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => logout.mutate(),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.heading}>PROFILE</Text>

        {/* Avatar + email */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
            <Text style={styles.role}>Donor</Text>
          </View>
        </View>

        {/* Account info card */}
        <Card style={styles.infoCard}>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <Spinner />
            </View>
          ) : (
            <>
              <InfoRow
                label="Member since"
                value={memberSince ?? '—'}
              />
              <View style={styles.infoSeparator} />
              <InfoRow
                label="Total donated"
                value={totalDonated ?? '—'}
                valueStyle={styles.donatedValue}
              />
            </>
          )}
        </Card>

        {/* Quick links */}
        <Card padding={0} style={styles.linksCard}>
          <Pressable
            style={({ pressed }) => [
              styles.linkRow,
              pressed && styles.linkRowPressed,
            ]}
            onPress={() => router.push('/(donor)/history')}
          >
            <Text style={styles.linkText}>My Donations</Text>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
        </Card>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            pressed && styles.signOutBtnPressed,
          ]}
          onPress={confirmSignOut}
          disabled={logout.isPending}
        >
          {logout.isPending ? (
            <Spinner color={colors.error} />
          ) : (
            <Text style={styles.signOutText}>Sign out</Text>
          )}
        </Pressable>

        {/* App version */}
        <Text style={styles.version}>
          v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
    letterSpacing: tracking.heading,
    marginBottom: spacing.xs,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.white,
  },
  avatarInfo: {
    flex: 1,
    gap: 2,
  },
  email: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.textDark,
  },
  role: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  // Info card
  infoCard: {
    gap: 0,
  },
  loadingRow: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  infoSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
  infoLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.textDark,
  },
  donatedValue: {
    color: colors.teal,
  },
  // Links card
  linksCard: {
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  linkRowPressed: {
    backgroundColor: colors.bg,
  },
  linkText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.textDark,
  },
  linkChevron: {
    fontFamily: font.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  // Sign out
  signOutBtn: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.btn,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
  },
  signOutBtnPressed: {
    opacity: 0.75,
  },
  signOutText: {
    fontFamily: font.bold,
    fontSize: fontSize.base,
    color: colors.error,
  },
  version: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
