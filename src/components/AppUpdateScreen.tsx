import { Linking, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_UPDATE_COPY, ERROR_CODES, ERROR_MESSAGES } from '@learning/shared';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';
import { storeUrlOf } from '@/lib/storeUrl';
import { useAppUpdateStore } from '@/store/appUpdate.store';
import { colors, fontSize, spacing } from '@/theme';

/** Does nothing: Android's Back button must not close the screen. */
function stay(): void {}

function openStore(): void {
  const url = storeUrlOf();
  if (url === null) return;
  Linking.openURL(url).catch((err) => warnBreadcrumb(BREADCRUMB_CATEGORY.ui, 'Could not open the store', err));
}

/**
 * The full-screen "update the app" screen (ADR-023 Decision 4), mounted once at the root over everything.
 * It can't be dismissed: no close button, and Back does nothing. Its button opens the store page for the
 * device; with no URL in the app config it does nothing.
 */
export function AppUpdateScreen() {
  const required = useAppUpdateStore((state) => state.required);
  return (
    <Modal visible={required} animationType="fade" statusBarTranslucent onRequestClose={stay}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Text style={styles.title}>{APP_UPDATE_COPY.title}</Text>
          <Text style={styles.message}>{ERROR_MESSAGES[ERROR_CODES.APP_UPDATE_REQUIRED]}</Text>
        </View>
        <Button testID="app-update-button" label={APP_UPDATE_COPY.button} onPress={openStore} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
  body: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { fontSize: fontSize.xl, color: colors.textStrong },
  message: { fontSize: fontSize.base, color: colors.textBody },
});
