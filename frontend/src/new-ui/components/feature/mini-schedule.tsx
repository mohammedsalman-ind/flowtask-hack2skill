import { Ionicons } from '@/components/ui/web-icons';
import { StyleSheet, View } from 'react-native';

import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/theme';

export type MiniScheduleTask = {
  time: string;
  title: string;
  done?: boolean;
};

export type MiniScheduleProps = {
  /** Date label in the card header */
  dateLabel?: string;
  tasks: MiniScheduleTask[];
  /** Ring diameter override (defaults 92) */
  ringSize?: number;
};

/**
 * The FlowTask daily plan as a real product card: header with date + live
 * progress ring, then time-rail task rows with ring-ticks. Used in Welcome,
 * the Plan intro panel, and Today's Up Next.
 */
export function MiniSchedule({ dateLabel = 'Mon, 15 Sept', tasks, ringSize = 92 }: MiniScheduleProps) {
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? done / tasks.length : 0;

  return (
    <Card elevated={false} style={[styles.card, shadowsWrap]}>
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <Ionicons name="chevron-back" size={14} color={colors.textSecondary} />
          <AppText variant="subtitle">{dateLabel}</AppText>
          <View style={styles.calChip}>
            <Ionicons name="calendar-outline" size={14} color={colors.accentDeep} />
          </View>
        </View>
        <AnimatedRing size={ringSize} strokeWidth={9} progress={pct}>
          <View style={styles.ringCenter}>
            <AppText variant="heading" style={styles.pct}>
              {Math.round(pct * 100)}%
            </AppText>
            <AppText variant="caption" style={styles.count}>
              {done} of {tasks.length} tasks{'\n'}complete
            </AppText>
          </View>
        </AnimatedRing>
      </View>

      <View style={styles.rows}>
        {tasks.map((t, i) => (
          <View key={`${t.time}-${i}`} style={styles.row}>
            <AppText variant="caption" style={styles.time}>
              {t.time}
            </AppText>
            <View style={[styles.tick, t.done ? styles.tickDone : null]}>
              {t.done ? (
                <Ionicons name="checkmark" size={12} color={colors.derived.onAccent} />
              ) : null}
            </View>
            <AppText variant="subtitle" style={[styles.title, t.done ? styles.titleDone : null]}>
              {t.title}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const shadowsWrap = {
  shadowColor: colors.derived.shadow,
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 12 },
  shadowRadius: 30,
  elevation: 8,
} as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  calChip: {
    marginLeft: 'auto',
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    alignItems: 'center',
  },
  pct: {
    fontSize: 22,
    lineHeight: 26,
  },
  count: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  rows: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  },
  titleDone: {
    color: colors.textSecondary,
  },
});
