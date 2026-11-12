import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';

const DOT = 10;

/** The Albert tab's icon; a gold dot sits on it when there is something for the person to review. */
export function AlbertTabIcon({ color, focused, badge }: { color?: string; focused: boolean; badge: boolean }) {
  return (
    <View>
      <Icon name="albert" size={24} color={color} fill={focused && color ? color : 'none'} />
      {badge && <View testID="albert-tab-dot" accessibilityLabel="Albert has a suggestion" style={styles.dot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position:        'absolute',
    top:             -2,
    right:           -4,
    width:           DOT,
    height:          DOT,
    borderRadius:    DOT / 2,
    backgroundColor: colors.warning,
    borderWidth:     2,
    borderColor:     colors.paper,
  },
});
