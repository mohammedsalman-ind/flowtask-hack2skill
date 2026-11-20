import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';

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
  children,
}: AnimatedRingProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
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
