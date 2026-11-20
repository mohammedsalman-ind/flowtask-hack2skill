import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/colors';

export type ProgressRingProps = {
  /** Progress from 0 to 1 */
  progress: number;
  /** Outer diameter of the ring in points */
  size?: number;
  /** Ring stroke thickness in points */
  strokeWidth?: number;
  /** Color of the progress arc in blush/mauve */
  accentColor?: string;
  /** Track color in very light lavender */
  trackColor?: string;
  /** Content rendered in the ring center (percentage, counts) */
  children?: React.ReactNode;
};

/**
 * Reusable circular progress visualization.
 *
 * Full background track plus a progress arc that starts at 12 o'clock and
 * sweeps clockwise. The center is free space for whatever the caller wants
 * to display (percentage, counts, or custom content).
 */
export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 12,
  accentColor = colors.accent,
  trackColor = colors.lavenderLight,
  children,
}: ProgressRingProps) {
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
