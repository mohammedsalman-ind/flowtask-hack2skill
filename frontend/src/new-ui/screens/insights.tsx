import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from '@/components/ui/web-motion';

import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { colors } from '@/theme/colors';
import { radii, screenPadding, spacing } from '@/theme/theme';
import { subscribeToTasks, tasks } from '@/lib/store';

/**
 * Insights — circular statistics only: completion donut, focus ring,
 * milestone circles. No horizontal bars.
 */
export default function Insights() {
  const router = useRouter();
  const [, refresh] = useState(0);
  useEffect(() => subscribeToTasks(() => refresh((n) => n + 1)), []);
  const completed = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const progress = total ? completed / total : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" tone="plain" onPress={() => router.back()} />
        <AppText variant="display" style={styles.title}>
          Insights
        </AppText>
      </View>

      <Animated.View entering={FadeInDown.duration(400).springify().damping(16)}>
        <Card elevated={false} style={styles.bigCard}>
          <AppText variant="heading">This week&apos;s flow</AppText>
          <View style={styles.bigRow}>
            <AnimatedRing size={148} strokeWidth={13} progress={progress}>
              <View style={styles.bigCenter}>
                <AppText variant="display" style={styles.bigPct}>
                  {Math.round(progress * 100)}%
                </AppText>
                <AppText variant="caption" style={styles.bigSub}>
                  {completed} of {total} tasks
                </AppText>
              </View>
            </AnimatedRing>
            <View style={styles.legend}>
              <LegendDot color={colors.accent} label="Completed" />
              <LegendDot color={colors.mauve} label="Completed tasks" />
              <LegendDot color={colors.lavender} label="All account tasks" />
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(350).delay(150)} style={styles.rowCards}>
        <Card elevated={false} style={styles.statCard}>
          <AnimatedRing size={76} strokeWidth={8} progress={0}>
            <AppText variant="subtitle" style={styles.statValue}>
              —
            </AppText>
          </AnimatedRing>
          <AppText variant="caption" style={styles.statLabel}>
            focus minutes not tracked
          </AppText>
        </Card>
        <Card elevated={false} style={styles.statCard}>
          <AnimatedRing size={76} strokeWidth={8} progress={0}>
            <AppText variant="subtitle" style={styles.statValue}>
              —
            </AppText>
          </AnimatedRing>
          <AppText variant="caption" style={styles.statLabel}>
            streak not tracked
          </AppText>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(350).delay(220)}>
        <Card elevated={false} style={styles.milestones}>
          <AppText variant="heading">Milestones</AppText>
          <View style={styles.milestoneRow}>
            <Milestone reached={completed > 0} label="First task" />
            <Milestone reached={completed >= 100} label="100 tasks" />
            <Milestone label="Focus tracking unavailable" />
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
        {reached ? <AppText variant="caption" style={styles.milestoneCheck}>✓</AppText> : null}
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
    paddingTop: 56,
    paddingBottom: 60,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.ink,
  },
  bigCard: {
    borderRadius: radii.xl,
    gap: spacing.xl,
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
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
  },
  bigSub: {
    color: colors.textSecondary,
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
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: colors.textSecondary,
  },
  rowCards: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.lg,
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  statValue: {
    color: colors.ink,
  },
  statLabel: {
    color: colors.textSecondary,
  },
  milestones: {
    borderRadius: radii.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestone: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  milestoneRing: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneOn: {
    borderColor: colors.accent,
    backgroundColor: colors.lavenderMist,
  },
  milestoneCheck: {
    color: colors.accentDeep,
    fontWeight: '700',
  },
  milestoneLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
