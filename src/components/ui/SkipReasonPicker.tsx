import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { SKIP_REASONS, SKIP_REASON_LABELS, SKIP_REASON_QUESTION, type SkipReason } from '@learning/shared';
import { colors, font, levelCard, press } from '@/theme';

/** How long the tapped reason shows filled, with a tick, before the sheet closes and the skip goes. */
export const SKIP_PICK_HOLD_MS = 300;
/** Dragging the sheet down further than this closes it. */
const SWIPE_CLOSE_PX = 80;

interface SkipReasonPickerProps {
  /** "Skip lesson", "Skip topic" or "Skip level": what is being skipped. */
  title?: string;
  /** Picking a reason is the tap that confirms the skip (079c); it is passed on after a beat. */
  onPick: (reason: SkipReason) => void;
  onCancel: () => void;
}

/**
 * A bottom sheet over the page: exactly the three reasons and a way out. No free text: it would be
 * a barrier. One tap on a reason skips; Cancel, a tap outside or a swipe down closes it.
 */
export function SkipReasonPicker({ title = 'Skip lesson', onPick, onCancel }: SkipReasonPickerProps) {
  const [picked, setPicked] = useState<SkipReason | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function pick(reason: SkipReason) {
    if (picked) return;
    setPicked(reason);
    timer.current = setTimeout(() => onPick(reason), SKIP_PICK_HOLD_MS);
  }

  // The latest onCancel and picked state, read by the gesture handlers created once.
  const live = useRef({ onCancel, picked });
  live.current = { onCancel, picked };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => !live.current.picked && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_e, g) => {
      if (g.dy > SWIPE_CLOSE_PX) live.current.onCancel();
      else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable testID="skip-reason-scrim" style={styles.scrim} onPress={onCancel}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: drag }] }]} {...pan.panHandlers}>
          <Pressable testID="skip-reason-picker" accessibilityLabel={SKIP_REASON_QUESTION} style={styles.content} onPress={() => { /* swallow: keep the sheet open */ }}>
            <View style={styles.handle} />
            <View style={styles.head}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.question}>{SKIP_REASON_QUESTION}</Text>
            </View>
            <View style={styles.reasons}>
              {SKIP_REASONS.map(reason => (
                <ReasonRow key={reason} reason={reason} selected={picked === reason} onPress={() => pick(reason)} />
              ))}
            </View>
            <Pressable testID="skip-reason-cancel" onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancel}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ReasonRow({ reason, selected, onPress }: { reason: SkipReason; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={`skip-reason-${reason}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>{SKIP_REASON_LABELS[reason]}</Text>
      {selected ? (
        <View testID={`skip-reason-${reason}-tick`} style={styles.tick}>
          <Icon name="check" size={14} color={colors.brand} strokeWidth={3} />
        </View>
      ) : (
        <Icon name="forward" size={18} color={colors.textSubtle} strokeWidth={2.2} />
      )}
    </Pressable>
  );
}

const ROW_HEIGHT = 56;
const ROW_RADIUS = 16;
const ROW_EDGE = 3;

const styles = StyleSheet.create({
  scrim:   { flex: 1, backgroundColor: 'rgba(18,21,34,0.48)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: colors.paper, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  content: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 44, gap: 18 },
  handle:  { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, alignSelf: 'center' },
  head:    { gap: 6, paddingTop: 4, paddingHorizontal: 4 },
  title:   { fontFamily: font.black, fontSize: 26, lineHeight: 26 * 1.05, letterSpacing: -0.035 * 26, color: colors.textStrong },
  question: { fontFamily: font.regular, fontSize: 16, lineHeight: 16 * 1.45, color: colors.textBody },
  reasons: { gap: 10 },
  // A white row with a 1.5pt ring and a solid 3pt edge under it, in the rule colour.
  row: {
    height:           ROW_HEIGHT,
    borderRadius:     ROW_RADIUS,
    backgroundColor:  colors.surface,
    borderWidth:      1.5,
    borderColor:      colors.border,
    borderBottomWidth: 1.5 + ROW_EDGE,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 18,
  },
  rowSelected: { backgroundColor: colors.brand, borderColor: colors.brand, borderBottomColor: levelCard.intermediate.edge, borderBottomWidth: 1.5 + press.edge },
  rowLabel:         { fontFamily: font.bold, fontSize: 17, color: colors.textStrong },
  rowLabelSelected: { fontFamily: font.extrabold, color: colors.onBrand },
  tick:   { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  cancel: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { fontFamily: font.bold, fontSize: 16, color: colors.textMuted },
});
