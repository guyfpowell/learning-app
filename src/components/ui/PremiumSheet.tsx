import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { colors, font, press } from '@/theme';

/**
 * The upgrade prompt as a bottom sheet over the page (board 22, 2a): a crown on an ink tile, the title,
 * the line, Upgrade now, and Maybe later. `children` sits between the line and the button.
 */
export function PremiumSheet({ visible, title, body, onUpgrade, onClose, testID, children }: {
  visible: boolean;
  title: string;
  body: string;
  onUpgrade: () => void;
  onClose: () => void;
  testID?: string;
  children?: ReactNode;
}) {
  if (!visible) return null;
  return (
    <SheetModal testID={testID} onClose={onClose}>
        <Pressable style={styles.sheet} onPress={() => { /* swallow: keep the sheet open */ }}>
          <View style={styles.handle} />
          <View style={styles.tile}>
            <Icon name="premium" size={30} color={colors.white} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {children}
          <View style={styles.upgrade}>
            <EdgeButton
              testID="upgrade-now-btn"
              look={{ face: colors.brand, label: colors.onBrand, edge: press.primaryEdge }}
              label="Upgrade now"
              icon="next"
              onPress={onUpgrade}
            />
          </View>
          <Pressable testID="dismiss-btn" onPress={onClose} accessibilityRole="button" style={styles.later}>
            <Text style={styles.laterLabel}>Maybe later</Text>
          </Pressable>
        </Pressable>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor:       colors.paper,
    borderTopLeftRadius:   32,
    borderTopRightRadius:  32,
    paddingTop:            12,
    paddingHorizontal:     24,
    paddingBottom:         44,
    alignItems:            'center',
    gap:                   14,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  tile:   { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.surfaceInverse, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  title:  { fontFamily: font.black, fontSize: 30, lineHeight: 30, letterSpacing: -0.035 * 30, color: colors.textStrong, textAlign: 'center' },
  body:   { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.45, color: colors.textBody, textAlign: 'center', maxWidth: 300 },
  upgrade: { alignSelf: 'stretch', marginTop: 8 },
  later:      { height: 44, alignItems: 'center', justifyContent: 'center' },
  laterLabel: { fontFamily: font.bold, fontSize: 16, color: colors.textMuted },
});
