import { Ionicons } from '@/components/ui/web-icons';
import { Pressable, PressableProps, StyleSheet } from 'react-native';

import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/theme';

export type IconButtonProps = PressableProps & {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  /** Circle fill: quiet tint or plain border */
  tone?: 'tint' | 'plain';
  label: string;
};

/** 40pt circular quiet button — back chevrons, bell, inbox, sheet closes. */
export function IconButton({ icon, size = 40, tone = 'tint', label, style, ...rest }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(state) => [
        styles.base,
        { width: size, height: size },
        tone === 'tint' ? styles.tint : styles.plain,
        state.pressed ? styles.pressed : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  tint: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  plain: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  gapNote: {
    marginTop: spacing.xs,
  },
});
