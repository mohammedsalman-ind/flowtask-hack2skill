import React, { useEffect } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { SpaceDot } from './space-dot';
import { AppText } from '../ui/app-text';
import { spaceName } from '../../utils/spaces';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/theme';
import { Task } from '../../types';

export type TaskRowProps = {
  task: Task | { id: string; title: string; done?: boolean; status?: string; due_date?: string | null; time?: string; context?: string; spaceId?: string; boardId?: string };
  onToggle?: (id: string) => void;
  onPress?: () => void;
  /** Hide trailing context space */
  compact?: boolean;
  /** Show the hairline divider above the row (default true) */
  divider?: boolean;
};

function formatDisplayTime(due_date?: string | null, fallbackTime?: string): string {
  if (fallbackTime) return fallbackTime;
  if (!due_date) return '—';
  try {
    const d = new Date(due_date);
    if (Number.isNaN(d.getTime())) return '—';
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 12 && m === 0 && due_date.endsWith('12:00:00.000Z')) {
      // Date-only default
      return '—';
    }
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

/**
 * The FlowTask task row: time · completion circle · title · SpaceDot + space.
 * Lives directly on the background between hairlines — never inside a heavy card.
 * Completion pulses the circle for tactile feedback.
 */
export function TaskRow({ task, onToggle, onPress, compact = false, divider = true }: TaskRowProps) {
  const isDone = 'done' in task ? !!task.done : task.status === 'done';
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withSequence(withTiming(1.22, { duration: 120 }), withSpring(1, { damping: 14 }));
  }, [isDone, pulse]);

  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const spaceId = (task as any).context || (task as any).spaceId || 'work';
  const displayTime = formatDisplayTime((task as any).due_date, (task as any).time);

  const rowContent = (
    <View style={[styles.row, divider ? styles.divider : null]}>
      <AppText variant="caption" style={styles.time}>
        {displayTime}
      </AppText>
      <Animated.View style={tickStyle}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
          accessibilityLabel={`Complete ${task.title}`}
          onPress={() => onToggle?.(task.id)}
          style={[styles.tick, isDone ? styles.tickDone : null]}>
          {isDone ? (
            <Ionicons name="checkmark" size={13} color={colors.derived.onAccent} />
          ) : null}
        </Pressable>
      </Animated.View>
      <AppText
        variant="subtitle"
        numberOfLines={1}
        style={[styles.title, isDone ? styles.titleDone : null]}>
        {task.title}
      </AppText>
      {!compact ? (
        <View style={styles.context}>
          <SpaceDot spaceId={spaceId} size={7} />
          <AppText variant="caption" numberOfLines={1} style={styles.contextLabel}>
            {spaceName(spaceId)}
          </AppText>
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {rowContent}
      </TouchableOpacity>
    );
  }

  return rowContent;
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
    width: 44,
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
});
