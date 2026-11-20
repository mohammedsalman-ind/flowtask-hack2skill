import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from './app-text';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/theme';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  action?: string;
  onAction?: () => void;
};

/**
 * Serif editorial section title ("Up next", space names) with an optional
 * accent action link — backward compatible with both new UI and legacy usage.
 */
export function SectionHeader({ title, actionLabel, action, onAction }: SectionHeaderProps) {
  const label = actionLabel || action;
  return (
    <View style={styles.row}>
      <AppText variant="sectionSerif">{title}</AppText>
      {label ? (
        onAction ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={label}
            onPress={onAction}
            style={({ pressed }) => (pressed ? styles.pressed : null)}>
            <AppText variant="caption" style={styles.action}>
              {label}
            </AppText>
          </Pressable>
        ) : (
          <Text style={styles.action}>{label}</Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: 6,
    marginBottom: 6,
  },
  action: {
    color: colors.accentDeep,
    fontWeight: '600',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
