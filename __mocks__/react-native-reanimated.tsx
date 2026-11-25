/**
 * Manual mock for react-native-reanimated (ticket 114). Its own `/mock` does not load under Jest here, and the app uses
 * only this subset: shared values, animated styles and props worked out once from the starting values, and timings that
 * hand back their target. Add others if new exports are used.
 */
import { useState, type ComponentType } from 'react';
import { View } from 'react-native';

export function useSharedValue<T>(initial: T): { value: T } {
  const [shared] = useState(() => ({ value: initial }));
  return shared;
}

export const useAnimatedStyle = <T,>(style: () => T): T => style();
export const useAnimatedProps = <T,>(props: () => T): T => props();
export const withTiming = <T,>(target: T): T => target;
export const withDelay = <T,>(_ms: number, animation: T): T => animation;

const same = (t: number) => t;
export const Easing = { bezier: () => same, inOut: () => same, quad: same, sin: same };

export default {
  View,
  createAnimatedComponent: <P extends object>(component: ComponentType<P>) => component,
};
