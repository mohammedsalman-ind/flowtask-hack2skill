import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from '@/components/ui/web-motion';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/theme';

export type DotProgressProps = {
  total: number;
  index: number;
  /** When provided, dots become tappable controls for the given step. */
  onPress?: (index: number) => void;
};

/** Story dots — filled with accent as the user advances. */
export function DotProgress({ total, index, onPress }: DotProgressProps) {
  const dots = Array.from({ length: total }, (_, i) => {
    const dot = <View style={[styles.dot, i <= index ? styles.active : null]} />;
    if (!onPress) return <View key={i}>{dot}</View>;
    return (
      <Pressable
        key={i}
        accessibilityRole="button"
        accessibilityLabel={`Go to step ${i + 1} of ${total}`}
        accessibilityState={i === index ? { selected: true } : {}}
        onPress={() => onPress(i)}
        style={styles.hit}>
        {dot}
      </Pressable>
    );
  });

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.row}
      accessibilityLabel={`Step ${index + 1} of ${total}`}
      accessibilityRole="progressbar">
      {dots}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  hit: {
    padding: spacing.xs,
    margin: -spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lavenderLight,
  },
  active: {
    backgroundColor: colors.accent,
    width: 20,
  },
});
