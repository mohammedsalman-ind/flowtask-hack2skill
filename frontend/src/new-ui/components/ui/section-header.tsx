import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/theme';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Serif editorial section title ("Up next", space names) with an optional
 * accent action link — replaces floating caps labels.
 */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="sectionSerif">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => (pressed ? styles.pressed : null)}>
          <AppText variant="caption" style={styles.action}>
            {actionLabel}
          </AppText>
        </Pressable>
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
  },
  action: {
    color: colors.accentDeep,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
