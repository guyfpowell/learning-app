import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';

const DOT = 10;

/**
 * The Albert tab's screen-reader name while the dot shows. The tab button's own label hides anything inside it,
 * so the dot is announced through the tab (`tabBarAccessibilityLabel`), never on the dot itself.
 */
export const ALBERT_TAB_BADGE_LABEL = 'Albert, Albert has something for you';

/** The Albert tab's icon; a gold dot sits on it when there is something for the person to review. */
export function AlbertTabIcon({ color, focused, badge }: { color?: string; focused: boolean; badge: boolean }) {
  return (
    <View>
      <Icon name="albert" size={24} color={color} fill={focused && color ? color : 'none'} />
      {badge && <View testID="albert-tab-dot" style={styles.dot} />}
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
