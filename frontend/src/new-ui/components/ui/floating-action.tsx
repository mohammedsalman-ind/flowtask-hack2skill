import { Ionicons } from '@/components/ui/web-icons';
import { Pressable, StyleSheet } from 'react-native';

import { softShadow, spacing } from '@/theme/theme';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';

export type FloatingActionButtonProps = {
  /** Called when the global create action is tapped */
  onPress?: () => void;
};

/**
 * The global "+" creation action. A single quiet accent circle floating above
 * the tab bar — visual shell only; behavior arrives with the create flow.
 */
export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed ? styles.pressed : null]}>
      <Ionicons name="add" size={26} color={colors.derived.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 76,
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  pressed: {
    opacity: 0.85,
  },
});
