import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

/** Shared upgrade prompt for the Tracks and Albert tabs. */
export function PremiumModal({ visible, onClose, onUpgrade }: PremiumModalProps) {
  return (
    <Modal testID="premium-modal" visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalIcon}>🔒</Text>
          <Text style={styles.modalTitle}>Premium Content</Text>
          <Text style={styles.modalBody}>
            Upgrade to unlock unlimited access to all premium tracks.
          </Text>
          <Button testID="upgrade-now-btn" label="Upgrade now" onPress={onUpgrade} />
          <Pressable testID="dismiss-btn" onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor:      colors.surface,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    padding:              spacing.xl,
    gap:                  spacing.md,
    alignItems:           'center',
  },
  modalIcon: { fontSize: 48 },
  modalTitle: {
    fontFamily: font.semibold,
    fontSize:   fontSize.lg,
    color:      colors.textStrong,
    textAlign:  'center',
  },
  modalBody: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    lineHeight: fontSize.base * 1.5,
  },
  dismissBtn: { paddingVertical: spacing.sm },
  dismissText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
});
