import { StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { chevronOpacitiesOf, LEVEL_CHEVRONS, type ChevronState } from '@learning/shared';

/** The drawn size of shared's 200-unit box. The art fills the middle third, so the side margins pull the empty space in. */
const BOX = 56;
const EMPTY_SIDE = 17;
const EMPTY_VERTICAL = 14;

/** The level chevrons beside Home's zone name. Decoration only: the zone's text names the level. */
export function LevelChevrons({ state }: { state: ChevronState }) {
  const opacities = chevronOpacitiesOf(state);
  if (opacities === null) return null;
  return (
    <Svg
      testID="level-chevrons"
      width={BOX}
      height={BOX}
      viewBox={LEVEL_CHEVRONS.viewBox}
      style={styles.box}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {LEVEL_CHEVRONS.chevrons.map((chevron, i) => (
        <Polyline
          key={chevron.points}
          points={chevron.points}
          fill="none"
          stroke={LEVEL_CHEVRONS.solidColor}
          strokeOpacity={opacities[i]}
          strokeWidth={LEVEL_CHEVRONS.strokeWidth}
          strokeLinecap={LEVEL_CHEVRONS.strokeLinecap}
          strokeLinejoin={LEVEL_CHEVRONS.strokeLinejoin}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  box: { flexShrink: 0, marginHorizontal: -EMPTY_SIDE, marginVertical: -EMPTY_VERTICAL },
});
