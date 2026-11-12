import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { colors, press, shadow } from '@/theme';

const SIZE = 44;
const RADIUS = 14;

/** Albert's mark: the sparkle on a cobalt tile with the pressed edge and a soft glow. */
export function AlbertTile() {
  return (
    <View style={styles.edge}>
      <View style={styles.face}>
        <Icon name="albert" size={24} color={colors.white} fill={colors.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    alignSelf:       'flex-start',
    paddingBottom:   press.edge,
    borderRadius:    RADIUS,
    backgroundColor: press.onCobaltEdge,
    ...shadow.brand,
  },
  face: {
    width:           SIZE,
    height:          SIZE,
    borderRadius:    RADIUS,
    backgroundColor: colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
