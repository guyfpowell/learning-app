import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ALTITUDE_TITLE } from '@learning/shared';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useGoBack } from '@/hooks/useGoBack';
import { HOME_ROUTE } from '@/lib/routes';
import { font } from '@/theme';
import { HEADER_ROW_HEIGHT, HEADER_ROW_TOP, headerFadeHeightOf, type HeaderLook } from './chartStyles';

const BACK_SIZE = 44;
const BACK_ICON_SIZE = 24;
const TITLE_SIZE = 17;
const SIDE_PADDING = 16;
/** Solid down to here, then clear at the foot of the fade. */
const FADE_SOLID_UNTIL = 0.62;

/** The header over the chart, as the design draws it: the fade, the back chevron and the title centred. `look` follows the band under it, and `topInset` is the status bar's height. */
export function AltitudeHeader({ look, topInset }: { look: HeaderLook; topInset: number }) {
  const goBack = useGoBack(HOME_ROUTE);
  return (
    <>
      <LinearGradient
        testID="altitude-header-fade"
        pointerEvents="none"
        colors={[look.fade, look.fade, look.fadeClear]}
        locations={[0, FADE_SOLID_UNTIL, 1]}
        style={[styles.fade, { height: headerFadeHeightOf(topInset) }]}
      />
      <View pointerEvents="box-none" style={[styles.row, { top: topInset + HEADER_ROW_TOP }]}>
        <Pressable testID="detail-back" onPress={goBack} accessibilityRole="button" accessibilityLabel="Go back" style={styles.back}>
          <Icon name="back" size={BACK_ICON_SIZE} color={look.ink} />
        </Pressable>
        <View pointerEvents="none" style={styles.titleBox}>
          <Text testID="altitude-header-title" style={[styles.title, { color: look.ink }]}>{ALTITUDE_TITLE}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fade:     { position: 'absolute', left: 0, right: 0, top: 0 },
  row:      { position: 'absolute', left: SIDE_PADDING, right: SIDE_PADDING, height: HEADER_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  back:     { width: BACK_SIZE, height: BACK_SIZE, alignItems: 'center', justifyContent: 'center' },
  titleBox: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  title:    { fontFamily: font.black, fontSize: TITLE_SIZE },
});
