import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './app-text';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/radii';
import { shadows, spacing } from '../../theme/theme';

export type ButtonProps = PressableProps & {
  /** Primary fills with the accent color; secondary is a quiet lavender fill */
  variant?: 'primary' | 'secondary';
};

/**
 * Single button component for FlowTask. Fully-rounded pill shape, restrained
 * colors — no gradients.
 */
export function Button({ variant = 'primary', style, ...rest }: ButtonProps) {
  return (
    <Pressable
      style={(state) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        state.pressed ? styles.pressed : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    />
  );
}

export function ButtonLabel({ variant = 'primary', children }: { variant?: 'primary' | 'secondary'; children?: React.ReactNode }) {
  return (
    <AppText variant="button" style={variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel}>
      {children || 'Button'}
    </AppText>
  );
}

export type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: object;
};

/**
 * Enhanced AppButton with the new FlowTask pill aesthetic, tactile active states,
 * and icon support. Backward-compatible with existing screens.
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const bgColor = isPrimary
    ? colors.accent
    : isDanger
      ? colors.danger
      : colors.surface;

  const textColor = isPrimary || isDanger ? colors.derived.onAccent : colors.text;
  const borderColor = isPrimary || isDanger ? 'transparent' : colors.border;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.appButton,
        { backgroundColor: bgColor, borderColor },
        isPrimary ? shadows.floating : shadows.card,
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={18} color={textColor} style={styles.buttonIcon} /> : null}
          <AppText variant="button" style={[styles.appButtonText, { color: textColor }]}>
            {label}
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.lavenderLight,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryLabel: {
    color: colors.derived.onAccent,
  },
  secondaryLabel: {
    color: colors.text,
  },
  appButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    borderWidth: 1,
    marginVertical: spacing.xs,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonIcon: {
    marginRight: 2,
  },
  appButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
