import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, fontSize, spacing } from '@/theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: fontSize.xl, color: colors.textDark },
  subtitle: { fontFamily: font.regular, fontSize: fontSize.base, color: colors.textMuted, marginTop: spacing.sm },
});
