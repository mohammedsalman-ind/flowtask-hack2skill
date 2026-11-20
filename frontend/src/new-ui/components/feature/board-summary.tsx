import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from '@/components/ui/web-motion';

import { SpaceDot } from '@/components/feature/space-dot';
import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { Board, tasksForBoard } from '@/lib/store';
import { colors } from '@/theme/colors';
import { radii, shadows, spacing } from '@/theme/theme';

export type BoardSummaryProps = {
  board: Board;
  index?: number;
  onPress?: () => void;
};

/**
 * Tilted board summary — the approved Organize paper composition, reused in
 * the Tasks "All" view. Mini ring, task count, two task previews with
 * SpaceDots. Odd cards sit slightly lower for the staggered feel.
 */
export function BoardSummary({ board, index = 0, onPress }: BoardSummaryProps) {
  const bTasks = tasksForBoard(board.id);
  const done = bTasks.filter((t) => t.done).length;
  const pct = bTasks.length ? done / bTasks.length : 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(350)
        .delay(index * 70)
        .springify()
        .damping(16)}
      style={[styles.cell, index % 2 === 1 ? styles.cellOffset : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${board.name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadows.card, pressed ? styles.pressed : null]}>
        <View style={styles.top}>
          <View style={styles.text}>
            <AppText variant="heading" numberOfLines={1} style={styles.name}>
              {board.name}
            </AppText>
            <AppText variant="caption" style={styles.meta}>
              {bTasks.length} tasks
            </AppText>
          </View>
          <AnimatedRing size={44} strokeWidth={5} progress={pct}>
            <AppText variant="micro" style={styles.pct}>
              {Math.round(pct * 100)}%
            </AppText>
          </AnimatedRing>
        </View>
        <View style={styles.previews}>
          {bTasks.slice(0, 2).map((t) => (
            <View key={t.id} style={styles.preview}>
              <SpaceDot spaceId={t.spaceId} size={6} />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={[styles.previewText, t.done ? styles.previewDone : null]}>
                {t.title}
              </AppText>
            </View>
          ))}
          {bTasks.length === 0 ? (
            <AppText variant="caption" style={styles.empty}>
              Nothing here yet
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: '50%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  cellOffset: {
    transform: [{ translateY: 12 }],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
  },
  meta: {
    color: colors.textSecondary,
  },
  pct: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.ink,
  },
  previews: {
    gap: spacing.xs,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewText: {
    color: colors.text,
    flex: 1,
  },
  previewDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  empty: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
