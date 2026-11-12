import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { QuizModal } from '@/components/QuizModal';
import { colors } from '@/theme';
import { previewCompletedLesson } from '@/lib/previewLesson';

/**
 * Dev-only (reached from Profile in development): the quiz opened on a lesson that is already
 * completed, which shows the "Already Completed" view. A made-up lesson; nothing is read or sent.
 */
export default function QuizAlreadyCompletedPreviewScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <QuizModal visible lesson={previewCompletedLesson()} onClose={() => router.back()} />
    </View>
  );
}
