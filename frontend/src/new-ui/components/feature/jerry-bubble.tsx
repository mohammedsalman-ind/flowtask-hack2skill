import { Ionicons } from '@/components/ui/web-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from '@/components/ui/web-motion';

import { SpaceDot } from '@/components/feature/space-dot';
import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { Tag } from '@/components/ui/chip';
import { boardName, dayLabel, spaceName, Task, toggleTask } from '@/lib/store';
import { colors } from '@/theme/colors';
import { radii, shadows, spacing } from '@/theme/theme';

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

export type JerryTaskResult = {
  title: string;
  when: string;
  space: string;
};

/**
 * Locked demo card — the approved onboarding Jerry panel renders this exact
 * static form. Do not restyle; the live card below is the evolving one.
 */
export function JerryTaskCard({ title, when, space }: JerryTaskResult) {
  return (
    <View style={[styles.resultCard, styles.legacyIndent, shadows.card]}>
      <View style={styles.resultRow}>
        <View style={styles.tick} />
        <AppText variant="subtitle" style={styles.resultTitle}>
          {title}
        </AppText>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        <AppText variant="caption" style={styles.meta}>
          {when}
        </AppText>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="albums-outline" size={13} color={colors.textSecondary} />
        <Tag label={space} tone="lavender" />
      </View>
    </View>
  );
}

/** A real FlowTask task Jerry just created — the live store object itself. */
export function JerryTaskResultCard({ task }: { task: Task }) {
  return (
    <View style={styles.cardRow}>
      <View style={[styles.resultCard, shadows.card]}>
        <View style={styles.resultRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
            accessibilityLabel={`Complete ${task.title}`}
            onPress={() => toggleTask(task.id)}
            style={[styles.tick, task.done ? styles.tickDone : null]}>
            {task.done ? <Ionicons name="checkmark" size={13} color={colors.derived.onAccent} /> : null}
          </Pressable>
          <AppText
            variant="subtitle"
            numberOfLines={1}
            style={[styles.resultTitle, task.done ? styles.titleDone : null]}>
            {task.title}
          </AppText>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
          <AppText variant="caption" style={styles.meta}>
            {task.time ? `${dayLabel(task.dayOffset)} · ${task.time}` : dayLabel(task.dayOffset)}
          </AppText>
        </View>
        <View style={styles.metaRow}>
          <SpaceDot spaceId={task.spaceId} size={7} />
          <AppText variant="caption" style={styles.meta}>
            {spaceName(task.spaceId)} · {boardName(task.boardId)}
          </AppText>
        </View>
      </View>
      {task.done ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.placedPill}>
          <Ionicons name="checkmark-circle" size={13} color={colors.accentDeep} />
          <AppText variant="micro" style={styles.placedText}>
            DONE
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

export type JerryMoveResult = {
  task: Task;
  from: string | null;
};

/** Jerry rescheduled a task — from → to, rendered in the language of the schedule. */
export function JerryMoveCard({ task, from }: JerryMoveResult) {
  return (
    <View style={styles.cardRow}>
      <View style={[styles.resultCard, styles.moveCard, shadows.card]}>
        <View style={styles.moveRow}>
          <Tag label={from ? `${from} · ${task.time ?? ''}` : 'Unscheduled'} tone="lavender" />
          <Ionicons name="arrow-forward" size={13} color={colors.accentDeep} />
          <Tag label={`${dayLabel(task.dayOffset)} · ${task.time ?? ''}`} tone="blush" />
        </View>
        <AppText variant="subtitle" numberOfLines={1} style={styles.resultTitle}>
          {task.title}
        </AppText>
        <View style={styles.metaRow}>
          <SpaceDot spaceId={task.spaceId} size={7} />
          <AppText variant="caption" style={styles.meta}>
            {spaceName(task.spaceId)} · {boardName(task.boardId)}
          </AppText>
        </View>
      </View>
      <View style={styles.placedPill}>
        <Ionicons name="checkmark-circle" size={13} color={colors.accentDeep} />
        <AppText variant="micro" style={styles.placedText}>
          SCHEDULED
        </AppText>
      </View>
    </View>
  );
}

export type JerryPlanBlock = {
  title: string;
  time?: string;
  type: Task['type'];
  spaceId: string;
};

export type JerryPlanResult = {
  blocks: JerryPlanBlock[];
  total: number;
  focusMinutes: number;
};

/** Jerry's proposed schedule — a real mini-schedule in the app's ring language. */
export function JerryPlanCard({ blocks, total, focusMinutes }: JerryPlanResult) {
  const pct = total === 0 ? 0 : blocks.filter((b) => b.type === 'focus').length / total;
  return (
    <View style={styles.cardRow}>
      <View style={[styles.resultCard, styles.planCard, shadows.card]}>
        <View style={styles.planRow}>
          <AnimatedRing size={46} strokeWidth={5} progress={pct} animateOnMount>
            <AppText variant="micro" style={styles.planPct}>
              {focusMinutes}m
            </AppText>
          </AnimatedRing>
          <View style={styles.planText}>
            <AppText variant="subtitle" style={styles.planTitle}>
              Your day, planned
            </AppText>
            <AppText variant="caption" style={styles.meta}>
              {total} blocks · {focusMinutes} min focus
            </AppText>
          </View>
        </View>
        <View style={styles.planBlocks}>
          {blocks.map((b, i) => (
            <View key={`${b.title}-${i}`} style={styles.planBlockRow}>
              <AppText variant="caption" style={styles.planTime}>
                {b.time ?? '—'}
              </AppText>
              <SpaceDot spaceId={b.spaceId} size={6} />
              <AppText variant="subtitle" numberOfLines={1} style={styles.planBlockTitle}>
                {b.title}
              </AppText>
              {b.type === 'focus' ? <Tag label="focus" tone="accent" /> : null}
            </View>
          ))}
        </View>
        <AppText variant="micro" style={styles.planFoot}>
          Applied to Today — open the tab to see it.
        </AppText>
      </View>
    </View>
  );
}

/** Jerry's "work on this next" recommendation — the real next open item. */
export function JerryNextCard({ task }: { task: Task }) {
  return (
    <View style={styles.cardRow}>
      <View style={[styles.resultCard, styles.nextCard, shadows.card]}>
        <AppText variant="micro" style={styles.nextEyebrow}>
          UP NEXT
        </AppText>
        <AppText variant="title" style={styles.nextTitle}>
          {task.title}
        </AppText>
        <View style={styles.metaRow}>
          <SpaceDot spaceId={task.spaceId} size={7} />
          <AppText variant="caption" style={styles.meta}>
            {task.time ? `${dayLabel(task.dayOffset)} · ${task.time}` : dayLabel(task.dayOffset)} ·{' '}
            {boardName(task.boardId)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    backgroundColor: colors.blushLight,
    borderRadius: radii.lg,
    borderBottomRightRadius: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '82%',
  },
  userText: {
    color: colors.ink,
  },
  jerryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  jerryBubble: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderBottomLeftRadius: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '82%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  jerryText: {
    color: colors.ink,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    height: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.mauve,
  },
  cardRow: {
    position: 'relative',
    marginLeft: 38,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  moveCard: {
    gap: spacing.sm,
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legacyIndent: {
    marginLeft: 38,
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
  resultTitle: {
    flex: 1,
    color: colors.ink,
  },
  titleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 2,
  },
  meta: {
    color: colors.textSecondary,
  },
  placedPill: {
    position: 'absolute',
    top: -9,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lavenderMist,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  placedText: {
    color: colors.accentDeep,
    fontWeight: '600',
  },
  planCard: {
    gap: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planPct: {
    color: colors.ink,
  },
  planText: {
    gap: 1,
    flex: 1,
  },
  planTitle: {
    color: colors.ink,
  },
  planBlocks: {
    gap: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.md,
  },
  planBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planTime: {
    width: 42,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  planBlockTitle: {
    flex: 1,
    color: colors.ink,
  },
  planFoot: {
    color: colors.textSecondary,
  },
  nextEyebrow: {
    color: colors.accentDeep,
  },
  nextTitle: {
    color: colors.ink,
  },
  nextCard: {
    gap: 4,
  },
});
