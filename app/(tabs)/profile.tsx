import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, fontSize, spacing } from '@/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Profile</Text>

        {user && (
          <Card style={styles.card}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </Card>
        )}

        <Button
          label="Log Out"
          variant="outline"
          style={styles.logoutBtn}
          loading={logout.isPending}
          onPress={() => logout.mutate()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { flex: 1, padding: spacing.md },
  heading: {
    fontFamily:   font.bold,
    fontSize:     fontSize.xl,
    color:        colors.textDark,
    marginBottom: spacing.lg,
  },
  card: { gap: spacing.xs, marginBottom: spacing.lg },
  name: {
    fontFamily: font.bold,
    fontSize:   fontSize.md,
    color:      colors.textDark,
  },
  email: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  logoutBtn: { marginTop: spacing.sm },
});
