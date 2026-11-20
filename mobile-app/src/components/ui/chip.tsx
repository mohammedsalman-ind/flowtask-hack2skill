import { Pressable, PressableProps, StyleSheet, View, ViewProps } from 'react-native';

import { AppText } from './app-text';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/theme';

export type ChipProps = PressableProps & {
  label: string;
  selected?: boolean;
  /** Small icon glyph name rendered before the label */
  icon?: React.ReactNode;
};

/** Selectable pill chip — goals, spaces, filters, quick actions. */
export function Chip({ label, selected = false, icon, style, ...rest }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : {}}
      style={(state) => [
        styles.base,
        selected ? styles.selected : null,
        state.pressed ? styles.pressed : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {icon}
      <AppText variant="subtitle" style={selected ? styles.selectedLabel : styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Static tint chip — metadata tags like "College", "in 20 min". */
export function Tag({ label, tone = 'lavender', style, ...rest }: ViewProps & {
  label: string;
  tone?: 'lavender' | 'blush' | 'accent';
}) {
  return (
    <View style={[styles.tag, tagTones[tone], style]} {...rest}>
      <AppText variant="caption" style={tone === 'accent' ? styles.tagAccentLabel : styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const tagTones = {
  lavender: { backgroundColor: colors.lavenderMist },
  blush: { backgroundColor: colors.blushMist },
  accent: { backgroundColor: colors.accent },
} as const;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  selected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.text,
  },
  selectedLabel: {
    color: colors.derived.onAccent,
  },
  tag: {
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  tagAccentLabel: {
    color: colors.derived.onAccent,
  },
});
