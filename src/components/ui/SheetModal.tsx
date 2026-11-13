import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

/** The grey wash behind a sheet. */
const SCRIM = 'rgba(18,21,34,0.48)';
const FADE_MS = 200;
const RISE_MS = 280;

/**
 * A bottom sheet's modal. The native `slide` animation moves everything in the modal, grey scrim
 * included, so the grey rose with the sheet. Here the modal has no animation of its own: the scrim
 * fades in on the spot and only the sheet rises. A tap on the scrim closes it; a tap on the sheet does not.
 */
export function SheetModal({ testID, scrimTestID, keyboardAvoiding, onClose, children }: {
  testID?: string;
  scrimTestID?: string;
  /** Lift the sheet above the keyboard (a sheet with a text field in it). */
  keyboardAvoiding?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: RISE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  return (
    <Modal testID={testID} transparent animationType="none" onRequestClose={onClose}>
      <Frame keyboardAvoiding={keyboardAvoiding}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, { opacity: fade }]} />
        <Pressable testID={scrimTestID} style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY: rise }] }}>{children}</Animated.View>
      </Frame>
    </Modal>
  );
}

function Frame({ keyboardAvoiding, children }: { keyboardAvoiding?: boolean; children: ReactNode }) {
  if (!keyboardAvoiding) return <View style={styles.fill}>{children}</View>;
  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{children}</KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  fill:  { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: SCRIM },
});
