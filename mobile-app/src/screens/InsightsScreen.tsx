import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AnimatedRing } from '../components/ui/animated-ring';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { IconButton } from '../components/ui/icon-button';
import { useTasks } from '../context/TasksContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { colors } from '../theme/colors';
import { radii, screenPadding, spacing } from '../theme/theme';

export default function InsightsScreen({ navigation }: any) {
  const paddingBottom = useSafeBottomPadding(40);
  const { tasks } = useTasks();

  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const pct = total > 0 ? completed / total : 0;
    const highPriority = tasks.filter((t) => t.priority === 'high' && t.status === 'done').length;
    const focusMinutes = completed * 25;
    return { total, completed, pct, highPriority, focusMinutes };
  }, [tasks]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <AppText variant="display" style={styles.title}>
          Insights
        </AppText>
      </View>

      {/* Primary Completion Donut */}
      <Animated.View entering={FadeInDown.duration(400).springify().damping(16)}>
        <Card elevated={false} style={styles.bigCard}>
          <AppText variant="heading">Overall completion</AppText>
          <View style={styles.bigRow}>
            <AnimatedRing size={148} strokeWidth={13} progress={metrics.pct}>
              <View style={styles.bigCenter}>
                <AppText variant="display" style={styles.bigPct}>
                  {Math.round(metrics.pct * 100)}%
                </AppText>
                <AppText variant="caption" style={styles.bigSub}>
                  {metrics.completed} of {metrics.total} tasks
                </AppText>
              </View>
            </AnimatedRing>
            <View style={styles.legend}>
              <LegendDot color={colors.accent} label="Completed" />
              <LegendDot color={colors.mauve} label="High priority" />
              <LegendDot color={colors.lavender} label="Focus rhythm" />
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Row stats */}
      <Animated.View entering={FadeIn.duration(350).delay(150)} style={styles.rowCards}>
        <Card elevated={false} style={styles.statCard}>
          <AnimatedRing size={76} strokeWidth={8} progress={Math.min(1, metrics.focusMinutes / 300)}>
            <AppText variant="subtitle" style={styles.statValue}>
              {metrics.focusMinutes}
            </AppText>
          </AnimatedRing>
          <AppText variant="caption" style={styles.statLabel}>
            focus minutes
          </AppText>
        </Card>
        <Card elevated={false} style={styles.statCard}>
          <AnimatedRing size={76} strokeWidth={8} progress={metrics.total > 0 ? 0.8 : 0}>
            <AppText variant="subtitle" style={styles.statValue}>
              {metrics.highPriority}
            </AppText>
          </AnimatedRing>
          <AppText variant="caption" style={styles.statLabel}>
            high priority done
          </AppText>
        </Card>
      </Animated.View>

      {/* Milestones */}
      <Animated.View entering={FadeIn.duration(350).delay(220)}>
        <Card elevated={false} style={styles.milestones}>
          <AppText variant="heading">Milestones</AppText>
          <View style={styles.milestoneRow}>
            <Milestone reached={metrics.completed >= 1} label="First task" />
            <Milestone reached={metrics.completed >= 10} label="10 tasks" />
            <Milestone reached={metrics.completed >= 50} label="50 tasks" />
          </View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" style={styles.legendLabel}>
        {label}
      </AppText>
    </View>
  );
}

function Milestone({ reached, label }: { reached?: boolean; label: string }) {
  return (
    <View style={styles.milestone}>
      <View style={[styles.milestoneRing, reached ? styles.milestoneOn : null]}>
        {reached ? (
          <AppText variant="caption" style={styles.milestoneCheck}>
            ✓
          </AppText>
        ) : null}
      </View>
      <AppText variant="micro" style={styles.milestoneLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: 54,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
  },
  bigCard: {
    borderRadius: radii.xl,
    gap: spacing.xl,
    backgroundColor: colors.surface,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  bigCenter: {
    alignItems: 'center',
  },
  bigPct: {
    fontSize: 28,
    color: colors.ink,
  },
  bigSub: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
  legend: {
    flex: 1,
    gap: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: colors.text,
  },
  rowCards: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
  },
  statValue: {
    color: colors.ink,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textSecondary,
  },
  milestones: {
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  milestone: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  milestoneRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderMist,
  },
  milestoneOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  milestoneCheck: {
    color: colors.derived.onAccent,
    fontWeight: '700',
  },
  milestoneLabel: {
    color: colors.textSecondary,
    fontSize: 10,
  },
});
