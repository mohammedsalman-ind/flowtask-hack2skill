import { Ionicons } from '@/components/ui/web-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from '@/components/ui/web-motion';

import { SpaceDot } from '@/components/feature/space-dot';
import { AppText } from '@/components/ui/app-text';
import { boardName, Task } from '@/lib/store';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/theme';

export type TaskRowProps = {
  task: Task;
  onToggle: (id: string) => void;
  /** Hide the trailing board label (context already known, e.g. board screen) */
  compact?: boolean;
  /** Show the hairline divider above the row (default true) */
  divider?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
};

/**
 * The FlowTask task row: time · completion circle · title · SpaceDot + board.
 * Lives directly on the background between hairlines — never inside a card.
 * Completion pulses the circle for tactile feedback.
 */
export function TaskRow({ task, onToggle, compact = false, divider = true, onEdit, onDelete }: TaskRowProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withSequence(withTiming(1.22, { duration: 120 }), withSpring(1, { damping: 14 }));
  }, [task.done, pulse]);

  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={[styles.row, divider ? styles.divider : null]}>
      <AppText variant="caption" style={styles.time}>
        {task.time ?? '—'}
      </AppText>
      <Animated.View style={tickStyle}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={`Complete ${task.title}`}
          onPress={() => onToggle(task.id)}
          style={[styles.tick, task.done ? styles.tickDone : null]}>
          {task.done ? (
            <Ionicons name="checkmark" size={13} color={colors.derived.onAccent} />
          ) : null}
        </Pressable>
      </Animated.View>
      <AppText
        variant="subtitle"
        numberOfLines={1}
        style={[styles.title, task.done ? styles.titleDone : null]}>
        {task.title}
      </AppText>
      {!compact ? (
        <View style={styles.context}>
          <SpaceDot spaceId={task.spaceId} size={7} />
          <AppText variant="caption" numberOfLines={1} style={styles.contextLabel}>
            {boardName(task.boardId)}
          </AppText>
        </View>
      ) : null}
      {onEdit ? <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} onPress={() => onEdit(task)} style={styles.action}><Ionicons name="pencil-outline" size={15} color={colors.textSecondary} /></Pressable> : null}
      {onDelete ? <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`} onPress={() => onDelete(task)} style={styles.action}><Ionicons name="trash-outline" size={15} color={colors.textSecondary} /></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  time: {
    width: 42,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  title: {
    flex: 1,
    color: colors.ink,
  },
  titleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 110,
    flexShrink: 1,
  },
  contextLabel: {
    color: colors.textSecondary,
    flexShrink: 1,
  },
  action: { padding: 6 },
});
