import { StyleSheet, View, ViewProps } from 'react-native';

import { softShadow, spacing } from '@/theme/theme';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';

export type CardProps = ViewProps & {
  /** Elevate with a soft shadow (defaults to true) */
  elevated?: boolean;
};

/**
 * Base white card surface. Compose content inside it — do not add behavior.
 */
export function Card({ elevated = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated ? softShadow : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
  },
});
