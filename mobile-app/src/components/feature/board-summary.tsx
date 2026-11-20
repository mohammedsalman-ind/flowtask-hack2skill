import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpaceDot } from './space-dot';
import { AnimatedRing } from '../ui/animated-ring';
import { AppText } from '../ui/app-text';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/theme';
import { Task } from '../../types';

export type BoardSummaryProps = {
  space: { id: string; name: string };
  tasks: Task[];
  index?: number;
  onPress?: () => void;
};

/**
 * Tilted board summary — the approved Organize paper composition.
 * Mini ring, task count, two task previews with SpaceDots.
 * Odd cards sit slightly lower for the staggered feel.
 */
export function BoardSummary({ space, tasks, index = 0, onPress }: BoardSummaryProps) {
  const done = tasks.filter((t) => t.status === 'done').length;
  const pct = tasks.length ? done / tasks.length : 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(350)
        .delay(index * 70)
        .springify()
        .damping(16)}
      style={[styles.cell, index % 2 === 1 ? styles.cellOffset : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${space.name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, shadows.card, pressed ? styles.pressed : null]}>
        <View style={styles.top}>
          <View style={styles.text}>
            <AppText variant="heading" numberOfLines={1} style={styles.name}>
              {space.name}
            </AppText>
            <AppText variant="caption" style={styles.meta}>
              {tasks.length} tasks
            </AppText>
          </View>
          <AnimatedRing size={44} strokeWidth={5} progress={pct}>
            <AppText variant="micro" style={styles.pct}>
              {Math.round(pct * 100)}%
            </AppText>
          </AnimatedRing>
        </View>
        <View style={styles.previews}>
          {tasks.slice(0, 2).map((t) => (
            <View key={t.id} style={styles.preview}>
              <SpaceDot spaceId={t.context || space.id} size={6} />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={[styles.previewText, t.status === 'done' ? styles.previewDone : null]}>
                {t.title}
              </AppText>
            </View>
          ))}
          {tasks.length === 0 ? (
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
    minHeight: 140,
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
    fontSize: 17,
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
