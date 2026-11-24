import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { ARRIVAL_MS, ARRIVAL_SPRING, countedMetresOf, type ArrivalPlan } from './arrivalSteps';

/** The arrival's progress values (each 0 to 1) and the two moments the screen changes on. */
export interface LandmarkArrivalRun {
  /** The bubble falling in from above the screen. */
  fall: Animated.Value;
  /** The bubble floating up to the Next card, growing as it goes. */
  float: Animated.Value;
  /** The metres counting up, on the same timing as the float (a number can't run on the native driver). */
  count: Animated.Value;
  /** The bubble's one slow swell outward before it sinks; it stays swelled as it sinks. */
  pulse: Animated.Value;
  /** The bubble shrinking into a hole. */
  sink: Animated.Value;
  /** The landmark's badge growing out of the hole until it covers the screen. */
  grow: Animated.Value;
  /** The badge falling back down onto its place on the card. */
  land: Animated.Value;
  /** The badge's spring bounce as it lands. */
  rise: Animated.Value;
  /** True once the bubble has floated up to the card. */
  reached: boolean;
  /** The metres the bubble shows: counting up while it floats. */
  metres: number;
  /** True once the badge has landed and settled: the card's button can be pressed. */
  cardShown: boolean;
}

const timing = (value: Animated.Value, duration: number, easing: (t: number) => number, toValue = 1) =>
  Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });

/** Runs the whole arrival once, on mount: fall, float, then (once `reached` is set) pause, pulse, sink, the badge growing over the screen, then landing into the card. */
export function useLandmarkArrival({ fromMetres, toMetres }: Pick<ArrivalPlan, 'fromMetres' | 'toMetres'>): LandmarkArrivalRun {
  const [values] = useState(() => ({ fall: new Animated.Value(0), float: new Animated.Value(0), count: new Animated.Value(0), pulse: new Animated.Value(0), sink: new Animated.Value(0), grow: new Animated.Value(0), land: new Animated.Value(0), rise: new Animated.Value(0) }));
  const [reached, setReached] = useState(false);
  const [metres, setMetres] = useState(() => countedMetresOf({ fromMetres, toMetres }, 0));
  const [cardShown, setCardShown] = useState(false);

  useEffect(() => {
    const { fall, float, count, pulse, sink, grow, land, rise } = values;
    const countListener = count.addListener(({ value }) => setMetres(countedMetresOf({ fromMetres, toMetres }, value)));
    const arrive = Animated.sequence([
      timing(fall, ARRIVAL_MS.fall, Easing.out(Easing.cubic)),
      Animated.parallel([
        timing(float, ARRIVAL_MS.float, Easing.inOut(Easing.sin)),
        Animated.timing(count, { toValue: 1, duration: ARRIVAL_MS.float, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    ]);
    const fallIn = Animated.sequence([
      Animated.delay(ARRIVAL_MS.pause),
      timing(pulse, ARRIVAL_MS.pulse, Easing.out(Easing.quad)),
      timing(sink, ARRIVAL_MS.sink, Easing.in(Easing.cubic)),
    ]);
    const cover = Animated.sequence([
      timing(grow, ARRIVAL_MS.grow, Easing.inOut(Easing.sin)),
      Animated.delay(ARRIVAL_MS.cover),
      timing(land, ARRIVAL_MS.land, Easing.in(Easing.cubic)),
    ]);
    const bounce = Animated.spring(rise, { toValue: 1, ...ARRIVAL_SPRING, useNativeDriver: true });
    arrive.start(({ finished }) => {
      if (!finished) return;
      setReached(true);
      fallIn.start(({ finished: sank }) => {
        if (!sank) return;
        cover.start(({ finished: landed }) => {
          if (!landed) return;
          bounce.start(({ finished: settled }) => {
            if (settled) setCardShown(true);
          });
        });
      });
    });
    return () => {
      count.removeListener(countListener);
      arrive.stop();
      fallIn.stop();
      cover.stop();
      bounce.stop();
    };
  }, [values, fromMetres, toMetres]);

  return { ...values, reached, metres, cardShown };
}
