import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  TRAILHEAD_SUBTITLE,
  TRAILHEAD_TITLE,
  trailheadCountCopy,
  trailheadNextCopy,
  trailheadProgressOf,
  trailheadStepStateOf,
  type Trailhead,
} from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { colors, font, fontSize } from '@/theme';
import { TrailheadStepRow } from './TrailheadStepRow';

const RING_SIZE = 36;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** The ring's dash: how much of the circle is filled, `done` of `total`. */
function ringDashOf(done: number, total: number): number {
  return total > 0 ? RING_LENGTH * (done / total) : 0;
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const centre = RING_SIZE / 2;
  return (
    <Svg testID="trailhead-ring" width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
      <Circle cx={centre} cy={centre} r={RING_RADIUS} stroke={colors.border} strokeWidth={RING_STROKE} fill="none" />
      <Circle
        cx={centre} cy={centre} r={RING_RADIUS} stroke={colors.brand} strokeWidth={RING_STROKE} fill="none"
        strokeLinecap="round" strokeDasharray={`${ringDashOf(done, total)} ${RING_LENGTH}`}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
    </Svg>
  );
}

/**
 * The Trailhead: seven starter steps, uncarded so the lesson card stays the one cobalt block. Starts
 * collapsed on the next step; tapping the header or its chevron opens the seven. Gone once finished
 * (the Trailhead medal's sheet comes from the celebration queue).
 */
export function TrailheadCard({ trailhead }: { trailhead: Trailhead }) {
  const [expanded, setExpanded] = useState(false);
  if (trailhead.finished) return null;
  const { done, total, next } = trailheadProgressOf(trailhead);

  return (
    <View testID="trailhead-card" style={styles.card}>
      <Pressable testID="trailhead-header" accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(open => !open)} style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title}>{TRAILHEAD_TITLE}</Text>
          <Text style={styles.subtitle}>{TRAILHEAD_SUBTITLE}</Text>
          <Text style={styles.count}>{trailheadCountCopy(done, total)}</Text>
        </View>
        <ProgressRing done={done} total={total} />
        <View style={expanded ? styles.chevronUp : undefined}>
          <Icon name="expand" size={20} color={colors.textMuted} />
        </View>
      </Pressable>
      {!expanded && next && <Text style={styles.next}>{trailheadNextCopy(next.name)}</Text>}
      {expanded && (
        <View style={styles.steps}>
          {trailhead.steps.map(step => <TrailheadStepRow key={step.key} step={step} state={trailheadStepStateOf(trailhead, step)} />)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, gap: 2 },
  title: { fontFamily: font.black, fontSize: fontSize.lg, color: colors.textStrong },
  subtitle: { fontFamily: font.regular, fontSize: fontSize.sm, color: colors.textMuted },
  count: { fontFamily: font.bold, fontSize: fontSize.sm, color: colors.textBody },
  next: { fontFamily: font.semibold, fontSize: fontSize.base, color: colors.brand },
  steps: { gap: 2 },
  chevronUp: { transform: [{ rotate: '180deg' }] },
});
