import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './app-text';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/theme';

export type FieldProps = TextInputProps & {
  label?: string;
  /** Error message shown under the field */
  error?: string;
};

/** Soft-fill text input with optional floating label and focus lift. */
export function Field({ label, error, style, onFocus, onBlur, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const lift = useSharedValue(0);

  const focusStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value * 2 }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.box, focused ? styles.boxFocused : null, shadows.card, focusStyle]}>
        {label ? (
          <AppText
            variant="micro"
            style={[styles.label, focused ? styles.labelFocused : null]}>
            {label}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label || rest.placeholder}
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

export type PasswordFieldProps = FieldProps & {
  value: string;
  onChangeText: (text: string) => void;
};

export function PasswordField({ value, onChangeText, placeholder = 'Password', label = 'Password', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={[styles.box, styles.passwordBox, shadows.card]}>
        {label ? (
          <AppText variant="micro" style={styles.label}>
            {label}
          </AppText>
        ) : null}
        <View style={styles.passwordRow}>
          <TextInput
            {...props}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!visible}
            autoCapitalize="none"
            style={[styles.input, styles.passwordInput, props.style]}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible((c) => !c)}
            style={styles.passwordToggle}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
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
  passwordBox: {
    paddingRight: spacing.sm,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  passwordToggle: {
    padding: spacing.xs,
  },
  error: {
    color: colors.danger,
  },
});
