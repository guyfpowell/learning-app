import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface AlbertMarkProps {
  size?: number;
  color?: string;
}

/** Albert's mark. The app has no logo artwork yet, so this is the sparkles icon the Albert tab uses. */
export function AlbertMark({ size = 16, color = colors.brand }: AlbertMarkProps) {
  return (
    <View testID="albert-mark">
      <Ionicons name="sparkles" size={size} color={color} />
    </View>
  );
}
