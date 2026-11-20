import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '../ui/app-text';
import { Sheet } from '../ui/sheet';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/theme';

export type CreateType = 'task' | 'reminder' | 'meeting' | 'note' | 'focus';

const OPTIONS: { type: CreateType; label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { type: 'task', label: 'Task', icon: 'checkmark-circle-outline', hint: 'Something to finish' },
  { type: 'reminder', label: 'Reminder', icon: 'notifications-outline', hint: 'A gentle nudge' },
  { type: 'meeting', label: 'Meeting AI', icon: 'sparkles-outline', hint: 'Record or analyze meeting notes' },
  { type: 'focus', label: 'Focus Session', icon: 'timer-outline', hint: 'Deep work timer' },
];

export type CreateMenuProps = {
  visible: boolean;
  onClose: () => void;
  onSelect?: (type: CreateType) => void;
};

/**
 * The global "+" creation menu — speed-dial options in a clean bottom sheet.
 */
export function CreateMenu({ visible, onClose, onSelect }: CreateMenuProps) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <AppText variant="heading" style={styles.title}>
        What do you want to create?
      </AppText>
      <View style={styles.stack}>
        {OPTIONS.map((o, i) => (
          <Animated.View
            key={o.type}
            entering={FadeInDown.duration(280).delay(i * 50).springify().damping(16)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Create ${o.label}`}
              onPress={() => {
                onSelect?.(o.type);
                onClose();
              }}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}>
              <View style={styles.iconChip}>
                <Ionicons name={o.icon} size={19} color={colors.accentDeep} />
              </View>
              <View style={styles.rowText}>
                <AppText variant="subtitle" style={styles.rowLabel}>
                  {o.label}
                </AppText>
                <AppText variant="caption" style={styles.rowHint}>
                  {o.hint}
                </AppText>
              </View>
              <Ionicons name="arrow-forward" size={15} color={colors.textSecondary} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  stack: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.ink,
  },
  rowHint: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
