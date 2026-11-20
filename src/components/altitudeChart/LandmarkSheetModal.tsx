import { Pressable, StyleSheet, View } from 'react-native';
import { ACHIEVEMENTS_BY_KEY, MEDAL_SHEET_CLOSE, type LandmarkKey, type LandmarkSheet } from '@learning/shared';
import { SheetModal } from '@/components/ui/SheetModal';
import { Text } from '@/components/ui/Text';
import { Medal } from '@/components/ui/Medal';
import { EdgeButton, SECONDARY_EDGE_LOOK } from '@/components/ui/EdgeButton';
import { colors, font, spacing } from '@/theme';

const SHEET_MEDAL_SIZE = 112;

/** A passed landmark's bottom sheet, opened from the Height Chart (brief section 4, landmark version; design `Ascent Celebrations`, S2). The words are `landmarkSheetOf`'s. */
export function LandmarkSheetModal({ landmarkKey, sheet, onClose }: { landmarkKey: LandmarkKey; sheet: LandmarkSheet; onClose: () => void }) {
  return (
    <SheetModal scrimTestID="landmark-sheet-scrim" onClose={onClose}>
      <Pressable style={styles.sheet} onPress={() => { /* swallow: keep the sheet open */ }}>
        <View testID="landmark-sheet" style={styles.content}>
          <View style={styles.handle} />
          <View testID="landmark-sheet-medal" style={styles.medal}>
            <Medal definition={ACHIEVEMENTS_BY_KEY[landmarkKey]} size={SHEET_MEDAL_SIZE} />
          </View>
          <Text testID="landmark-sheet-eyebrow" style={styles.eyebrow}>{sheet.eyebrow}</Text>
          <Text testID="landmark-sheet-name" style={styles.name}>{sheet.name}</Text>
          <Text testID="landmark-sheet-height-line" style={styles.heightLine}>{sheet.heightLine}</Text>
          <Text testID="landmark-sheet-passed-on" style={styles.passedOn}>{sheet.passedOn}</Text>
          <View style={styles.close}>
            <EdgeButton
              testID="landmark-sheet-close"
              look={SECONDARY_EDGE_LOOK}
              label={MEDAL_SHEET_CLOSE}
              onPress={onClose}
            />
          </View>
        </View>
      </Pressable>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor:      colors.paper,
    borderTopLeftRadius:  34,
    borderTopRightRadius: 34,
    paddingTop:           14,
    paddingHorizontal:    24,
    paddingBottom:        44,
  },
  content:   { alignItems: 'center' },
  handle:    { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: 26 },
  medal:     { marginBottom: 22 },
  eyebrow:   { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.08 * 12, color: colors.altitudeText },
  name:      { fontFamily: font.black, fontSize: 34, lineHeight: 34 * 1.05, letterSpacing: -0.04 * 34, color: colors.textStrong, textAlign: 'center', marginTop: spacing.sm },
  heightLine: { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.45, color: colors.textBody, textAlign: 'center', maxWidth: 320, marginTop: 10 },
  passedOn:  { fontFamily: font.extrabold, fontSize: 15, color: colors.textMuted, marginTop: spacing.md },
  close:     { alignSelf: 'stretch', marginTop: spacing.lg },
});
