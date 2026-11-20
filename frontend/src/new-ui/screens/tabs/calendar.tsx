import { Ionicons } from '@/components/ui/web-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from '@/components/ui/web-motion';
import { SpaceDot } from '@/components/feature/space-dot';
import { AppText } from '@/components/ui/app-text';
import { AnimatedRing } from '@/components/ui/animated-ring';
import { Chip, Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet } from '@/components/ui/sheet';
import {
  addTask,
  dayForOffset,
  dayHasItems,
  scheduledForOffset,
  setTaskTime,
  spaceName,
  subscribeToTasks,
  Task,
  toggleTask,
  unscheduleTask,
} from '@/lib/store';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HOUR_H = 60;
const START_HOUR = 7;
const END_HOUR = 23;
const GUTTER = 52;
const ENTRY_H = 68;
/** Evaluated once per mount — demo "now". */
const NOW_MIN = new Date().getHours() * 60 + new Date().getMinutes();

type EntryTone = { backgroundColor: string; borderLeftColor: string };

const entryKind: Record<
  Task['type'],
  { label: string; icon: keyof typeof Ionicons.glyphMap; tone: EntryTone }
> = {
  task: { label: 'Task', icon: 'albums-outline', tone: { backgroundColor: colors.blushLight, borderLeftColor: colors.mauve } },
  meeting: { label: 'Meeting', icon: 'people-outline', tone: { backgroundColor: colors.lavenderLight, borderLeftColor: colors.lavender } },
  reminder: { label: 'Reminder', icon: 'notifications-outline', tone: { backgroundColor: colors.surface, borderLeftColor: colors.border } },
  focus: { label: 'Focus', icon: 'timer-outline', tone: { backgroundColor: colors.surface, borderLeftColor: colors.accent } },
  note: { label: 'Note', icon: 'document-outline', tone: { backgroundColor: colors.surface, borderLeftColor: colors.border } },
};

/**
 * Calendar — the planning surface. A live week strip above a day timeline:
 * hour rail, entries positioned by time and differentiated by type
 * (background tint + left rule + glyph), a now-line on today, and a
 * tap-through detail sheet with reschedule actions. Days without items get
 * the FlowTask empty composition.
 */
export default function Calendar() {
  const [selectedOffset, setSelectedOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const [detail, setDetail] = useState<Task | null>(null);
  const [subtle, setSubtle] = useState(false);

  useEffect(() => subscribeToTasks(() => setTick((t) => t + 1)), []);

  const stripDays = useMemo(() => Array.from({ length: 7 }, (_, i) => dayForOffset(i - 3)), []);
  const dayDate = dayForOffset(selectedOffset);
  const monthLabel = dayDate
    .toLocaleString('en-US', { month: 'long' })
    .toUpperCase();
  const dayItems = useMemo(() => {
    void tick; // recomputed after store mutations, not just selection changes
    return scheduledForOffset(selectedOffset);
  }, [selectedOffset, tick]);
  const doneCount = dayItems.filter((t) => t.done).length;
  const dayPct = dayItems.length === 0 ? 0 : doneCount / dayItems.length;
  const spacesToday = [...new Set(dayItems.map((t) => t.spaceId))].slice(0, 4);
  const emptyDay = dayItems.length === 0;
  const isToday = selectedOffset === 0;
  const showNow = isToday && NOW_MIN >= START_HOUR * 60 && NOW_MIN <= END_HOUR * 60;
  const timelineH = (END_HOUR - START_HOUR) * HOUR_H;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="display" style={styles.title}>
            Calendar
          </AppText>
          <AppText variant="micro" style={styles.monthLabel}>
            {monthLabel} {dayDate.getFullYear()}
          </AppText>
        </View>
        {!isToday ? (
          <Chip label="Today" onPress={() => setSelectedOffset(0)} style={styles.todayChip} />
        ) : null}
      </View>

      {/* Week strip — 7 live days, today carries a subtle tint */}
      <View style={styles.strip}>
        {stripDays.map((d, i) => {
          const offset = i - 3;
          const active = offset === selectedOffset;
          const isNow = offset === 0;
          return (
            <Pressable
              key={d.toISOString()}
              accessibilityRole="button"
              accessibilityState={active ? { selected: true } : {}}
              accessibilityLabel={`${d.toLocaleString('en-US', { weekday: 'long' })}, ${d.getDate()}`}
              onPress={() => {
                setSubtle(true);
                setSelectedOffset(offset);
              }}
              style={({ pressed }) => [
                styles.day,
                active ? styles.dayActive : null,
                !active && isNow ? styles.dayNow : null,
                pressed ? styles.pressed : null,
              ]}>
              <AppText variant="micro" style={active ? styles.dayLetterActive : styles.dayLetter}>
                {DAY_LETTERS[(d.getDay() + 6) % 7]}
              </AppText>
              <AppText variant="subtitle" style={active ? styles.dayNumActive : styles.dayNum}>
                {d.getDate()}
              </AppText>
              <View style={styles.dayDots}>
                {dayHasItems(offset) ? (
                  <>
                    <View style={[styles.dayDot, { backgroundColor: colors.mauve }]} />
                    <View style={[styles.dayDot, { backgroundColor: colors.lavender }]} />
                  </>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Day summary — the shared circular language, small */}
      <Animated.View key={`sum-${selectedOffset}-${tick}`} entering={FadeIn.duration(250)} style={styles.daySummary}>
        <AnimatedRing size={52} strokeWidth={5} progress={dayPct} animateOnMount={!subtle}>
          <AppText variant="micro" style={styles.ringPct}>
            {dayItems.length > 0 ? `${Math.round(dayPct * 100)}%` : '—'}
          </AppText>
        </AnimatedRing>
        <View style={styles.daySummaryText}>
          <AppText variant="heading" style={styles.daySummaryTitle}>
            {isToday
              ? 'Today'
              : dayDate.toLocaleString('en-US', { weekday: 'long' })}
          </AppText>
          <View style={styles.daySummaryMeta}>
            {spacesToday.map((s) => (
              <SpaceDot key={s} spaceId={s} size={7} />
            ))}
            <AppText variant="caption" style={styles.daySummarySub}>
              {emptyDay
                ? 'Nothing scheduled'
                : `${dayItems.length} item${dayItems.length === 1 ? '' : 's'} · ${doneCount} done`}
            </AppText>
          </View>
        </View>
      </Animated.View>

      {/* Day timeline */}
      {emptyDay ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="A clear day."
            sub="Schedule something below, or let Jerry plan it."
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add to this day"
            onPress={() => {
              addTask({ title: 'New plan', time: '09:00', dayOffset: selectedOffset });
            }}
            style={({ pressed }) => [styles.addDay, pressed ? styles.pressed : null]}>
            <View style={styles.addCircle}>
              <Ionicons name="add" size={16} color={colors.derived.onAccent} />
            </View>
            <AppText variant="subtitle" style={styles.addLabel}>
              Plan something for{' '}
              {isToday ? 'today' : dayDate.toLocaleString('en-US', { weekday: 'long' })}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <Animated.ScrollView
          key={`tl-${selectedOffset}`}
          entering={FadeInDown.duration(380).springify().damping(17)}
          contentContainerStyle={styles.timeline}
          showsVerticalScrollIndicator={false}>
          {/* Hour rail */}
          <View>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map((h) => (
              <View key={h} style={styles.railRow}>
                <AppText variant="caption" style={styles.railTime}>
                  {String(h).padStart(2, '0')}:00
                </AppText>
                <View style={styles.railLine} />
              </View>
            ))}
          </View>

          {/* Entries positioned by time */}
          <View style={[styles.entries, { height: timelineH }]}>
            {dayItems.map((t, i) => {
              const [h, m] = (t.time ?? '09:00').split(':').map(Number);
              const min = h * 60 + m;
              if (min < START_HOUR * 60 || min > END_HOUR * 60 - 30) return null;
              const kind = entryKind[t.type] ?? entryKind.task;
              return (
                <Animated.View
                  key={t.id}
                  entering={FadeInUp.delay(i * 70).duration(320).springify().damping(17)}
                  style={[styles.entryWrap, { top: ((min - START_HOUR * 60) / 60) * HOUR_H + 3 }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${kind.label} ${t.title} at ${t.time}`}
                    onPress={() => setDetail(t)}
                    style={({ pressed }) => [
                      styles.entry,
                      kind.tone,
                      t.done ? styles.entryDone : null,
                      pressed ? styles.entryPressed : null,
                    ]}>
                    <View style={styles.entryTop}>
                      <AppText variant="micro" style={styles.entryTime}>
                        {t.time}
                      </AppText>
                      <View style={styles.entryHead}>
                        <Ionicons name={kind.icon} size={12} color={colors.textSecondary} />
                        <AppText variant="micro" style={styles.entryKind}>
                          {kind.label}
                        </AppText>
                      </View>
                    </View>
                    <AppText
                      variant="subtitle"
                      numberOfLines={1}
                      style={[styles.entryTitle, t.done ? styles.entryTitleDone : null]}>
                      {t.title}
                    </AppText>
                    <View style={styles.entryContext}>
                      <SpaceDot spaceId={t.spaceId} size={6} />
                      <AppText variant="micro" numberOfLines={1} style={styles.entrySpace}>
                        {spaceName(t.spaceId)} · {t.done ? 'Done' : 'Open'}
                      </AppText>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}

            {/* Now-line — only on today */}
            {showNow ? (
              <View pointerEvents="none" style={[styles.nowWrap, { top: ((NOW_MIN - START_HOUR * 60) / 60) * HOUR_H }]}>
                <View style={styles.nowDot} />
                <View style={styles.nowLine} />
              </View>
            ) : null}
          </View>

          {/* Gently pinning the rest of the day */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add to this day"
            onPress={() => {
              addTask({ title: 'New plan', time: '09:00', dayOffset: selectedOffset });
            }}
            style={({ pressed }) => [styles.addRow, pressed ? styles.pressed : null]}>
            <View style={styles.addCircleMuted}>
              <Ionicons name="add" size={14} color={colors.textSecondary} />
            </View>
            <AppText variant="caption" style={styles.addRowLabel}>
              Plan something for {isToday ? 'tonight' : 'this day'}
            </AppText>
          </Pressable>
        </Animated.ScrollView>
      )}

      {/* Item detail */}
      <Sheet visible={detail !== null} onClose={() => setDetail(null)}>
        {detail ? (
          <View style={styles.detail}>
            <View style={styles.detailHead}>
              <View style={[styles.detailGlyph, { backgroundColor: (entryKind[detail.type] ?? entryKind.task).tone.backgroundColor }]}>
                <Ionicons
                  name={(entryKind[detail.type] ?? entryKind.task).icon}
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
              <View style={styles.detailHeadText}>
                <AppText variant="micro" style={styles.detailKind}>
                  {(entryKind[detail.type] ?? entryKind.task).label.toUpperCase()} · {detail.time}
                </AppText>
                <AppText variant="title" style={styles.detailTitle}>
                  {detail.title}
                </AppText>
              </View>
            </View>

            <View style={[styles.detailRow, styles.detailDivider]}>
              <AppText variant="caption" style={styles.detailLabel}>
                Space
              </AppText>
              <View style={styles.detailValue}>
                <SpaceDot spaceId={detail.spaceId} size={8} />
                <AppText variant="subtitle">{spaceName(detail.spaceId)}</AppText>
              </View>
            </View>
            <View style={[styles.detailRow, styles.detailDivider]}>
              <AppText variant="caption" style={styles.detailLabel}>
                Status
              </AppText>
              <Tag label={detail.done ? 'Done' : 'Open'} tone={detail.done ? 'lavender' : 'blush'} />
            </View>

            {!detail.apiTask.organization_id && <View style={styles.detailActions}>
              {(['17:00', '18:00', '19:00'] as const).map((time) => (
                <Chip
                  key={time}
                  label={`Move to ${time}`}
                  selected={detail.time === time}
                  onPress={() => {
                    setTaskTime(detail.id, time);
                    setDetail({ ...detail, time });
                  }}
                />
              ))}
            </View>}
            <View style={styles.detailActions}>
              {!detail.done && detail.type !== 'meeting' ? (
                <Chip
                  label="Mark done"
                  icon={<Ionicons name="checkmark" size={14} color={colors.accentDeep} />}
                  onPress={() => {
                    toggleTask(detail.id);
                    setDetail({ ...detail, done: true });
                  }}
                />
              ) : null}
              {!detail.apiTask.organization_id && <Chip
                label="Remove from schedule"
                onPress={() => {
                  unscheduleTask(detail.id);
                  setDetail(null);
                }}
              />}
            </View>
            <AppText variant="micro" style={styles.detailFoot}>
              {detail.apiTask.organization_id ? 'Manage the deadline in the organization workspace.' : 'Changes are saved to your schedule.'}
            </AppText>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: 64,
  },
  headerText: {
    gap: 2,
  },
  title: {
    color: colors.ink,
  },
  monthLabel: {
    color: colors.textSecondary,
  },
  todayChip: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  day: {
    alignItems: 'center',
    gap: 2,
    width: 42,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  dayActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dayNow: {
    backgroundColor: colors.lavenderMist,
  },
  pressed: {
    opacity: 0.8,
  },
  dayLetter: {
    color: colors.textSecondary,
  },
  dayLetterActive: {
    color: colors.accentDeep,
  },
  dayNum: {
    color: colors.ink,
  },
  dayNumActive: {
    color: colors.accentDeep,
    fontWeight: '600',
  },
  dayDots: {
    height: 4,
    flexDirection: 'row',
    gap: 2,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  daySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
  ringPct: {
    color: colors.ink,
  },
  daySummaryText: {
    gap: 2,
  },
  daySummaryTitle: {
    color: colors.ink,
  },
  daySummaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daySummarySub: {
    color: colors.textSecondary,
  },
  emptyWrap: {
    paddingHorizontal: screenPadding,
    paddingBottom: 140,
  },
  addDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  addRowLabel: {
    color: colors.textSecondary,
  },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleMuted: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    color: colors.ink,
  },
  timeline: {
    paddingHorizontal: screenPadding,
    paddingBottom: 40,
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HOUR_H,
    gap: spacing.md,
  },
  railTime: {
    width: GUTTER - spacing.md,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  railLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  entries: {
    position: 'absolute',
    left: screenPadding,
    right: screenPadding,
    top: 0,
  },
  entryWrap: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
  },
  entry: {
    minHeight: ENTRY_H - 8,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 2,
    ...shadows.card,
  },
  entryPressed: {
    opacity: 0.85,
  },
  entryDone: {
    opacity: 0.6,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryTime: {
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  entryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryKind: {
    color: colors.textSecondary,
  },
  entryTitle: {
    color: colors.ink,
  },
  entryTitleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  entryContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  entrySpace: {
    color: colors.textSecondary,
  },
  nowWrap: {
    position: 'absolute',
    left: GUTTER - 12,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  nowLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  detail: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailGlyph: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeadText: {
    flex: 1,
    gap: 1,
  },
  detailKind: {
    color: colors.textSecondary,
  },
  detailTitle: {
    color: colors.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  detailDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  detailLabel: {
    color: colors.textSecondary,
  },
  detailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailFoot: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },
});
