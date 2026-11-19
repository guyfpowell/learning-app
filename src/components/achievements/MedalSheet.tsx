import { View, StyleSheet, Pressable } from 'react-native';
import {
  ACHIEVEMENTS_BY_KEY,
  CELEBRATION_CONTINUE,
  JUST_EARNED,
  celebrationEyebrow,
  hasMedalArt,
  type MedalGridItem,
  type RewardUnlock,
} from '@learning/shared';
import { SheetModal } from '@/components/ui/SheetModal';
import { Text } from '@/components/ui/Text';
import { Medal } from '@/components/ui/Medal';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { medalJewelOf } from '@/lib/medalJewel';
import { colors, font, press, spacing } from '@/theme';

const SHEET_MEDAL_SIZE = 112;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** A medal just earned, as the sheet shows it. The words come from the server's payload; the catalogue is read only to draw the medal. */
export function celebrationItemOf({ key, name, description }: RewardUnlock): MedalGridItem {
  return { key, definition: ACHIEVEMENTS_BY_KEY[key], earned: true, name, description, unlockedAt: null };
}

/**
 * A medal's bottom sheet (brief section 4): its medal, its category, what it is and how it was (or is) earned.
 * `celebrating` is the sheet opened as a celebration: "Just earned" replaces the earned date, and Continue replaces Close.
 */
export function MedalSheet({ item, celebrating, onClose }: { item: MedalGridItem; celebrating: boolean; onClose: () => void }) {
  const { earned, definition, unlockedAt } = item;
  const eyebrow = hasMedalArt(definition) ? celebrationEyebrow(definition) : null;
  const eyebrowColor = earned ? medalJewelOf(definition) : colors.textMuted;

  return (
    <SheetModal scrimTestID="achievement-detail-scrim" onClose={onClose}>
      <Pressable style={styles.sheet} onPress={() => { /* swallow: keep the sheet open */ }}>
        <View testID="achievement-detail-modal" style={styles.sheetContent}>
          <View style={styles.handle} />
          <View style={styles.sheetMedal}>
            <Medal definition={definition} locked={!earned} size={SHEET_MEDAL_SIZE} />
          </View>

          {eyebrow && <Text testID="achievement-detail-eyebrow" style={[styles.eyebrow, { color: eyebrowColor }]}>{eyebrow}</Text>}
          <Text testID="achievement-detail-name" style={styles.sheetName}>{item.name}</Text>

          {earned ? (
            <Text testID="achievement-detail-description" style={styles.sheetDescription}>{item.description}</Text>
          ) : (
            <View style={styles.howTo}>
              <Text style={styles.howToLabel}>HOW TO EARN IT</Text>
              <Text testID="achievement-detail-description" style={styles.howToText}>{item.description}</Text>
            </View>
          )}

          <SheetNote celebrating={celebrating} earned={earned} unlockedAt={unlockedAt} />

          <View style={styles.close}>
            <EdgeButton
              testID="achievement-detail-close"
              look={{ face: colors.white, label: colors.textStrong, edge: press.secondaryEdge }}
              label={celebrating ? CELEBRATION_CONTINUE : 'Close'}
              onPress={onClose}
            />
          </View>
        </View>
      </Pressable>
    </SheetModal>
  );
}

/** The line under the words: "Just earned" in a celebration, otherwise the earned date, or that it is not earned yet. */
function SheetNote({ celebrating, earned, unlockedAt }: { celebrating: boolean; earned: boolean; unlockedAt: string | null }) {
  if (celebrating) return <Text testID="achievement-detail-just-earned" style={styles.sheetNote}>{JUST_EARNED}</Text>;
  if (unlockedAt) return <Text testID="achievement-detail-earned-date" style={styles.sheetNote}>Earned {formatDate(unlockedAt)}</Text>;
  return earned ? null : <Text style={styles.sheetNote}>Not earned yet</Text>;
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor:      colors.paper,
    borderTopLeftRadius:  32,
    borderTopRightRadius: 32,
    paddingTop:           12,
    paddingHorizontal:    28,
    paddingBottom:        44,
  },
  sheetContent: { alignItems: 'center', gap: 14 },
  handle:       { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  sheetMedal:   { paddingTop: 10, paddingBottom: spacing.xs },
  eyebrow:      { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12 },
  sheetName:    { fontFamily: font.black, fontSize: 30, lineHeight: 30, letterSpacing: -0.035 * 30, color: colors.textStrong, textAlign: 'center' },
  sheetDescription: { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.45, color: colors.textBody, textAlign: 'center', maxWidth: 290 },
  howTo: {
    alignSelf:         'stretch',
    gap:               6,
    paddingVertical:   14,
    marginTop:         spacing.xs,
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.border,
  },
  howToLabel: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.08 * 12, color: colors.textMuted },
  howToText:  { fontFamily: font.semibold, fontSize: 17, lineHeight: 17 * 1.4, color: colors.textStrong },
  sheetNote:  { fontFamily: font.bold, fontSize: 13, color: colors.textMuted },
  close:      { alignSelf: 'stretch', marginTop: spacing.sm },
});
