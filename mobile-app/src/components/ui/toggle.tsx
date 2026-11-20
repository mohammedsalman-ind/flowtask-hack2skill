import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/theme';

export type ToggleProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
};

/** Soft switch — 44pt touch target, spring thumb. */
export function Toggle({ value, onValueChange, label }: ToggleProps) {
  const t = useSharedValue(value ? 1 : 0);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: t.value === 1 ? colors.accent : colors.lavenderLight,
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value === 1 ? 22 : 2 }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        t.value = withSpring(value ? 0 : 1, { damping: 16 });
        onValueChange(!value);
      }}
      style={styles.hit}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    padding: spacing.xs,
  },
  track: {
    width: 50,
    height: 30,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    shadowColor: colors.derived.shadow,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
});
