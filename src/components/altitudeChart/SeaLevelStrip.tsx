import { StyleSheet, View } from 'react-native';
import { SEA_LEVEL_LABEL } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { colors, font } from '@/theme';
import { SEA_LEVEL_STRIP_HEIGHT, SEA_LEVEL_Y } from './chartLayout';

const RULE_EVERY = 9;
const LABEL_LEFT = 76;
const LABEL_TOP = 14;
const LABEL_SIZE = 12;
const LABEL_TRACKING_EM = 0.1;
const RULE_COLOUR = '#E7E2D8';
const RULE_OPACITY = 0.7;
const RULE_TOPS = Array.from({ length: Math.ceil(SEA_LEVEL_STRIP_HEIGHT / RULE_EVERY) }, (_, i) => i * RULE_EVERY);

/** The strip under sea level: a 1pt ruled line every 9, and the sea level label. */
export function SeaLevelStrip() {
  return (
    <View testID="altitude-sea-level-strip" pointerEvents="none" style={styles.strip}>
      <View style={styles.rules}>
        {RULE_TOPS.map((top) => (
          <View key={top} style={[styles.rule, { top }]} />
        ))}
      </View>
      <Text testID="altitude-sea-level" style={styles.label}>{SEA_LEVEL_LABEL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { position: 'absolute', left: 0, right: 0, top: SEA_LEVEL_Y, height: SEA_LEVEL_STRIP_HEIGHT },
  rules: { ...StyleSheet.absoluteFill, opacity: RULE_OPACITY },
  rule:  { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: RULE_COLOUR },
  label: { position: 'absolute', left: LABEL_LEFT, top: LABEL_TOP, fontFamily: font.extrabold, fontSize: LABEL_SIZE, letterSpacing: LABEL_SIZE * LABEL_TRACKING_EM, color: colors.textMuted },
});
