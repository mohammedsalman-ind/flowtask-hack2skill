import { Pressable, PressableProps, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/theme';

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
        // Resolve function-valued caller styles — RN arrays can't nest functions
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    />
  );
}

export function ButtonLabel({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  return (
    <AppText variant="button" style={variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel}>
      Button
    </AppText>
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
});
