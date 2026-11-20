import Svg, { Line } from 'react-native-svg';
import { leaderBoxOf } from './chartStyles';

const LEADER_WIDTH = 1.2;

/** A leader line from the rail at the true height (`trueY`) to a row's, card's or marker's shown centre (`shownY`), both down the canvas. */
export function LeaderLine({ testID, trueY, shownY, colour }: { testID: string; trueY: number; shownY: number; colour: string }) {
  const { left, top, width, height, x1, y1, x2, y2 } = leaderBoxOf(trueY, shownY);
  return (
    <Svg testID={testID} pointerEvents="none" style={{ position: 'absolute', left, top }} width={width} height={height}>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={colour} strokeWidth={LEADER_WIDTH} />
    </Svg>
  );
}
