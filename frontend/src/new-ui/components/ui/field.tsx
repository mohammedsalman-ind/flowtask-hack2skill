import { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from '@/components/ui/web-motion';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { radii, shadows, spacing } from '@/theme/theme';

export type FieldProps = TextInputProps & {
  label: string;
  /** Error message shown under the field */
  error?: string;
};

/** Soft-fill text input with floating label and focus lift. */
export function Field({ label, error, style, onFocus, onBlur, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const lift = useSharedValue(0);

  const focusStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 2 }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.box, focused ? styles.boxFocused : null, shadows.card, focusStyle]}>
        <AppText
          variant="micro"
          style={[styles.label, focused ? styles.labelFocused : null]}>
          {label}
        </AppText>
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, style]}
          placeholderTextColor={colors.textSecondary}
          onFocus={(e) => {
            setFocused(true);
            lift.value = withTiming(1, { duration: 160 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            lift.value = withTiming(0, { duration: 160 });
            onBlur?.(e);
          }}
          {...rest}
        />
      </Animated.View>
      {error ? (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  box: {
    backgroundColor: colors.lavenderMist,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  boxFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  label: {
    color: colors.textSecondary,
  },
  labelFocused: {
    color: colors.accentDeep,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    padding: 0,
  },
  error: {
    color: colors.danger,
  },
});
