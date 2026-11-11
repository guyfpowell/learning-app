import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { TopicEnd } from '@learning/shared';
import { colors, spacing } from '@/theme';
import { TopicFeedback } from '@/components/ui/TopicFeedback';

/** A made-up topic, so the real end-of-topic screen can be styled without finishing a lesson. */
const PREVIEW_TOPIC_END: TopicEnd = {
  planId: 'preview-plan',
  stableKey: 'preview-topic',
  title: 'Preview topic',
};

/** Dev-only (reached from Profile in development). Nothing is sent to the API. */
export default function TopicFeedbackPreviewScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <TopicFeedback
        topicEnd={PREVIEW_TOPIC_END}
        onSubmit={() => Promise.resolve()}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: spacing.lg },
});
