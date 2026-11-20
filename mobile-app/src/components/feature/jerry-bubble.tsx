import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SpaceDot } from './space-dot';
import { AnimatedRing } from '../ui/animated-ring';
import { AppText } from '../ui/app-text';
import { Tag } from '../ui/chip';
import { spaceName } from '../../utils/spaces';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/theme';
import { Task } from '../../types';

/** User message — blush bubble, right-aligned. */
export function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <AppText variant="subtitle" style={styles.userText}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

/** Jerry reply — white bubble with sparkle avatar, left-aligned. */
export function JerryBubble({ text }: { text: string }) {
  return (
    <View style={styles.jerryRow}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles" size={16} color={colors.accentDeep} />
      </View>
      <View style={styles.jerryBubble}>
        <AppText variant="subtitle" style={styles.jerryText}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

/** Jerry thinking — three drifting blush dots beside the avatar. */
export function JerryTyping() {
  const one = useSharedValue(0);
  const two = useSharedValue(0);
  const three = useSharedValue(0);

  useEffect(() => {
    one.value = withRepeat(withSequence(withTiming(-3, { duration: 340 }), withTiming(0, { duration: 340 })), -1);
    two.value = withRepeat(
      withSequence(withDelay(120, withTiming(-3, { duration: 340 })), withTiming(0, { duration: 340 })),
      -1,
    );
    three.value = withRepeat(
      withSequence(withDelay(240, withTiming(-3, { duration: 340 })), withTiming(0, { duration: 340 })),
      -1,
    );
  }, [one, two, three]);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: one.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: two.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: three.value }] }));

  return (
    <View style={styles.jerryRow}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles" size={16} color={colors.accentDeep} />
      </View>
      <View style={[styles.jerryBubble, styles.typingBubble]}>
        <Animated.View style={[styles.dot, s1]} />
        <Animated.View style={[styles.dot, s2]} />
        <Animated.View style={[styles.dot, s3]} />
      </View>
    </View>
  );
}

/** A real FlowTask task result Jerry just created or updated */
export function JerryTaskResultCard({
  task,
  onToggle,
  onPress,
}: {
  task: Task | { id?: string; title: string; due_date?: string | null; status?: string; context?: string };
  onToggle?: (id: string) => void;
  onPress?: () => void;
}) {
  const isDone = task.status === 'done';
  const space = (task as any).context || 'work';
  const when = task.due_date ? new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today';

  return (
    <View style={styles.cardRow}>
      <Pressable onPress={onPress} style={[styles.resultCard, shadows.card]}>
        <View style={styles.resultRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDone }}
            accessibilityLabel={`Complete ${task.title}`}
            onPress={() => task.id && onToggle?.(task.id)}
            style={[styles.tick, isDone ? styles.tickDone : null]}>
            {isDone ? <Ionicons name="checkmark" size={13} color={colors.derived.onAccent} /> : null}
          </Pressable>
          <AppText
            variant="subtitle"
            numberOfLines={1}
            style={[styles.resultTitle, isDone ? styles.titleDone : null]}>
            {task.title}
          </AppText>
        </View>

        <View style={styles.metaCluster}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <AppText variant="caption" style={styles.meta}>
              {when}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <SpaceDot spaceId={space} size={7} />
            <Tag label={spaceName(space)} tone="lavender" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

/** Day plan breakdown card */
export function JerryPlanCard({
  blocks,
  total,
  focusMinutes,
}: {
  blocks: (Task | { id: string; title: string; time?: string; context?: string })[];
  total: number;
  focusMinutes: number;
}) {
  return (
    <View style={styles.cardRow}>
      <View style={[styles.resultCard, shadows.card]}>
        <View style={styles.planHeader}>
          <View>
            <AppText variant="subtitle" style={styles.resultTitle}>
              Today&apos;s schedule
            </AppText>
            <AppText variant="caption" style={styles.meta}>
              {total} planned blocks · ~{focusMinutes}m focus
            </AppText>
          </View>
          <AnimatedRing size={42} strokeWidth={4} progress={0.35}>
            <AppText variant="micro" style={styles.planPct}>
              35%
            </AppText>
          </AnimatedRing>
        </View>
        <View style={styles.blocks}>
          {blocks.slice(0, 4).map((b, i) => (
            <View key={b.id || i} style={styles.blockRow}>
              <AppText variant="caption" style={styles.blockTime}>
                {(b as any).time || '09:00'}
              </AppText>
              <SpaceDot spaceId={(b as any).context || 'work'} size={6} />
              <AppText variant="subtitle" numberOfLines={1} style={styles.blockTitle}>
                {b.title}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Recommendation card for next task */
export function JerryNextCard({
  task,
  onPress,
}: {
  task: Task | { id: string; title: string; time?: string; context?: string };
  onPress?: () => void;
}) {
  return (
    <View style={styles.cardRow}>
      <Pressable onPress={onPress} style={[styles.resultCard, styles.nextCard, shadows.card]}>
        <View style={styles.nextEyebrow}>
          <Ionicons name="sparkles" size={13} color={colors.accentDeep} />
          <AppText variant="micro" style={styles.nextLabel}>
            RECOMMENDED NEXT
          </AppText>
        </View>
        <AppText variant="heading" style={styles.nextTitle}>
          {task.title}
        </AppText>
        <View style={styles.metaRow}>
          <SpaceDot spaceId={(task as any).context || 'work'} size={7} />
          <AppText variant="caption" style={styles.meta}>
            {spaceName((task as any).context)}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: colors.blushLight,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  userText: {
    color: colors.ink,
  },
  jerryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    maxWidth: '88%',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  jerryBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderTopLeftRadius: radii.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  jerryText: {
    color: colors.ink,
  },
  typingBubble: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  cardRow: {
    marginLeft: 40,
    marginBottom: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tick: {
    width: 20,
    height: 20,
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
  resultTitle: {
    flex: 1,
    color: colors.ink,
    fontWeight: '600',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  metaCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: colors.textSecondary,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planPct: {
    color: colors.ink,
  },
  blocks: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  blockTime: {
    width: 44,
    color: colors.textSecondary,
  },
  blockTitle: {
    flex: 1,
    color: colors.text,
  },
  nextCard: {
    backgroundColor: colors.lavenderMist,
    borderColor: colors.lavender,
  },
  nextEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextLabel: {
    color: colors.accentDeep,
    letterSpacing: 1.2,
  },
  nextTitle: {
    color: colors.ink,
  },
});
