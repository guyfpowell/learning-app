import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { ARRIVAL_MS, countedMetresOf, type ArrivalPlan } from './arrivalSteps';

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
  /** The landmark card (and a white flash) exploding out from the hole. */
  burst: Animated.Value;
  /** True once the bubble has floated up to the card. */
  reached: boolean;
  /** The metres the bubble shows: counting up while it floats. */
  metres: number;
  /** True once the card has finished exploding out: its button can be pressed. */
  cardShown: boolean;
}

const timing = (value: Animated.Value, duration: number, easing: (t: number) => number, toValue = 1) =>
  Animated.timing(value, { toValue, duration, easing, useNativeDriver: true });

/** Runs the whole arrival once, on mount: fall, rest, float, then (once `reached` is set) pause, pulse, sink and burst into the card. */
export function useLandmarkArrival({ fromMetres, toMetres }: Pick<ArrivalPlan, 'fromMetres' | 'toMetres'>): LandmarkArrivalRun {
  const [values] = useState(() => ({ fall: new Animated.Value(0), float: new Animated.Value(0), count: new Animated.Value(0), pulse: new Animated.Value(0), sink: new Animated.Value(0), burst: new Animated.Value(0) }));
  const [reached, setReached] = useState(false);
  const [metres, setMetres] = useState(() => countedMetresOf({ fromMetres, toMetres }, 0));
  const [cardShown, setCardShown] = useState(false);

  useEffect(() => {
    const { fall, float, count, pulse, sink, burst } = values;
    const countListener = count.addListener(({ value }) => setMetres(countedMetresOf({ fromMetres, toMetres }, value)));
    const arrive = Animated.sequence([
      timing(fall, ARRIVAL_MS.fall, Easing.out(Easing.cubic)),
      Animated.delay(ARRIVAL_MS.rest),
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
    const explode = timing(burst, ARRIVAL_MS.burst, Easing.out(Easing.cubic));
    arrive.start(({ finished }) => {
      if (!finished) return;
      setReached(true);
      fallIn.start(({ finished: sank }) => {
        if (!sank) return;
        explode.start(({ finished: exploded }) => {
          if (exploded) setCardShown(true);
        });
      });
    });
    return () => {
      count.removeListener(countListener);
      arrive.stop();
      fallIn.stop();
      explode.stop();
    };
  }, [values, fromMetres, toMetres]);

  return { ...values, reached, metres, cardShown };
}
