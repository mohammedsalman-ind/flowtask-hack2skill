import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

import { colors } from '../../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type AnimatedRingProps = {
  /** Progress from 0 to 1 */
  progress: number;
  /** Outer diameter in points */
  size?: number;
  /** Stroke thickness in points */
  strokeWidth?: number;
  /** Progress arc color */
  accentColor?: string;
  /** Track color */
  trackColor?: string;
  /** Animate on mount from 0 (default true) */
  animateOnMount?: boolean;
  /** Re-animate whenever progress changes */
  animateOnChange?: boolean;
  /** Ring center content */
  children?: React.ReactNode;
};

/**
 * The FlowTask circular progress ring — the app's single progress language.
 *
 * Animated variant of ProgressRing: the arc springs to its value on mount and
 * whenever progress changes. Center is free space for any content.
 */
export function AnimatedRing({
  progress,
  size = 120,
  strokeWidth = 12,
  accentColor = colors.accent,
  trackColor = colors.ringTrack,
  animateOnMount = true,
  animateOnChange = true,
  children,
}: AnimatedRingProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const anim = useSharedValue(animateOnMount ? 0 : clamped);

  useEffect(() => {
    anim.value = withSpring(clamped, { damping: 18, stiffness: 90 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateOnChange ? clamped : 0]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - anim.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
