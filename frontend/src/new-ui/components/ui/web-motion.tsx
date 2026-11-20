/* oxlint-disable react/only-export-components -- this adapter intentionally exports RN motion helpers with its components. */
import { useRef } from 'react';
import { Animated as NativeAnimated, ScrollView, View } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';

type Entering = { entering?: unknown; exiting?: unknown; layout?: unknown };
function MotionView({ entering: _entering, exiting: _exiting, layout: _layout, ...props }: ComponentProps<typeof View> & Entering) {
  return <View {...props} />;
}
function MotionScrollView({ entering: _entering, exiting: _exiting, layout: _layout, ...props }: ComponentProps<typeof ScrollView> & Entering) {
  return <ScrollView {...props} />;
}

const builder = () => {
  const chain = { duration: (_value: number) => chain, delay: (_value: number) => chain, springify: () => chain, damping: (_value: number) => chain };
  return chain;
};
export const FadeIn = builder();
export const FadeInDown = builder();
export const FadeInUp = builder();
export const ZoomIn = builder();
export const Easing = { ease: (value: number) => value, in: (fn: (value: number) => number) => fn };
export const withTiming = <T,>(to: T, _config?: unknown) => to;
export const withSpring = <T,>(to: T, _config?: unknown) => to;
export const withDelay = <T,>(_delay: number, value: T) => value;
export const withRepeat = <T,>(value: T, ..._args: unknown[]) => value;
export const withSequence = <T,>(...values: T[]): T => values.at(-1)!;
export function useSharedValue<T,>(initial: T) { return useRef({ value: initial }).current; }
export function useAnimatedStyle<T,>(callback: () => T): T { return callback(); }
export function useAnimatedProps<T,>(callback: () => T): T { return callback(); }

const Animated = {
  View: MotionView,
  ScrollView: MotionScrollView,
  createAnimatedComponent: NativeAnimated.createAnimatedComponent,
};
export default Animated;
export type { ReactNode };
