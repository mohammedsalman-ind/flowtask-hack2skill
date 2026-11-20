import { Ionicons } from '@/components/ui/web-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from '@/components/ui/web-motion';

import { SpaceDot } from '@/components/feature/space-dot';
import { TaskRow } from '@/components/feature/task-row';
import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeader } from '@/components/ui/section-header';
import {
  todayMeetings,
  todayTasks,
  subscribeToTasks,
  toggleTask,
  Task,
} from '@/lib/store';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

/**
 * Today — the asymmetric command center. Header (no card), hero cluster with
 * the ring left and stat stack right, Up Next as the body (hairline rows,
 * never cards), serif section headers, meetings peek, ink Focus moment,
 * thumb-zone capture pill.
 */
export default function Today() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(() => todayTasks());
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Stay in sync with the shared store — created tasks appear in Up Next
  useEffect(
    () => subscribeToTasks(() => setTasks([...todayTasks()])),
    [],
  );

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? done / tasks.length : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const meetings = useMemo(() => todayMeetings(), []);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const isEmpty = tasks.length === 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            // Replay the entrance stagger, then settle
            setTimeout(() => {
              setRefreshKey((k) => k + 1);
              setRefreshing(false);
            }, 450);
          }}
          tintColor={colors.accent}
        />
      }>
      {/* Greeting header — asymmetric, no card */}
      <View key={`header-${refreshKey}`} style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="micro" style={styles.dateEyebrow}>
            {dateLabel}
          </AppText>
          <AppText variant="display" style={styles.greeting}>
            {greeting},{' '}
            <AppText variant="displayItalic" style={styles.greetingAccent}>
              friend.
            </AppText>
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="notifications-outline" label="Notifications" />
          <IconButton icon="trail-sign-outline" label="Inbox" />
        </View>
      </View>

      {/* Hero cluster — ring left, stat stack right */}
      <Animated.View
        key={`hero-${refreshKey}`}
        entering={FadeInDown.duration(450).springify().damping(16)}
        style={styles.hero}>
        <AnimatedRing size={116} strokeWidth={11} progress={pct}>
          <View style={styles.ringCenter}>
            <AppText variant="display" style={styles.ringPct}>
              {Math.round(pct * 100)}%
            </AppText>
            <AppText variant="caption" style={styles.ringSub}>
              {done} of {tasks.length} tasks
            </AppText>
          </View>
        </AnimatedRing>
        <View style={styles.statStack}>
          <StatChip icon="people-outline" label="Meetings" value={meetings.length} />
          <StatChip icon="trail-sign-outline" label="Reminders" value={2} />
          <StatChip icon="sparkles-outline" label="Focus" value="25m" />
        </View>
      </Animated.View>

      {isEmpty ? (
        <EmptyState
          ringProgress={0}
          title="A clear day."
          sub="Nothing scheduled — capture a thought below."
        />
      ) : (
        <>
          {/* Up Next — the body: hairline rows on the background, not a card */}
          <Animated.View
            key={`upnext-${refreshKey}`}
            entering={FadeIn.duration(350).delay(120)}
            style={styles.section}>
            <SectionHeader title="Up next" actionLabel="All tasks" onAction={() => router.push('/(tabs)/tasks' as never)} />
            <View style={styles.rows}>
              {[...tasks]
                .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
                .slice(0, 9)
                .map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggleTask} />
                ))}
            </View>
          </Animated.View>

          {/* Meetings — peeking carousel */}
          <Animated.View
            key={`meetings-${refreshKey}`}
            entering={FadeIn.duration(350).delay(200)}
            style={styles.section}>
            <SectionHeader
              title="Meetings"
              actionLabel="Calendar"
              onAction={() => router.push('/(tabs)/calendar' as never)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.meetings}>
              {meetings.map((m) => (
                <Card key={m.id} elevated={false} style={styles.meetingCard}>
                  <AppText variant="caption" style={styles.meetingTime}>
                    {m.time}
                  </AppText>
                  <AppText variant="subtitle" style={styles.meetingTitle}>
                    {m.title}
                  </AppText>
                  <View style={styles.meetingMeta}>
                    <SpaceDot spaceId={m.spaceId} size={6} />
                    <AppText variant="caption" style={styles.meetingUntil}>
                      in 20 min
                    </AppText>
                  </View>
                </Card>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New meeting"
                style={({ pressed }) => [styles.meetingCard, styles.meetingAdd, pressed ? styles.pressed : null]}>
                <Ionicons name="add" size={18} color={colors.accentDeep} />
                <AppText variant="caption" style={styles.meetingAddLabel}>
                  New meeting
                </AppText>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* Focus — the single ink moment */}
      <Animated.View entering={FadeIn.duration(350).delay(260)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a focus session"
          onPress={() => router.push('/focus' as never)}
          style={({ pressed }) => [styles.focusCard, pressed ? styles.pressed : null]}>
          <View style={styles.focusIcon}>
            <Ionicons name="timer-outline" size={22} color={colors.derived.onAccent} />
          </View>
          <View style={styles.focusText}>
            <AppText variant="heading" style={styles.focusTitle}>
              Focus
            </AppText>
            <AppText variant="caption" style={styles.focusSub}>
              25 min · deep work session
            </AppText>
          </View>
          <Ionicons name="play" size={18} color={colors.accentDeep} />
        </Pressable>
      </Animated.View>

      {/* Quick capture — thumb-zone pill, the text-first "+" shortcut */}
      <View style={styles.captureDock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture a thought"
          style={({ pressed }) => [styles.capturePill, pressed ? styles.pressed : null]}>
          <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
          <AppText variant="bodySecondary" style={styles.captureText}>
            Capture a thought…
          </AppText>
          <View style={styles.mic}>
            <Ionicons name="mic-outline" size={16} color={colors.accentDeep} />
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={16} color={colors.accentDeep} />
      <AppText variant="subtitle" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" style={styles.statLabel}>
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
    paddingTop: 64,
    paddingBottom: 148,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  dateEyebrow: {
    color: colors.textSecondary,
  },
  greeting: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 36,
  },
  greetingAccent: {
    color: colors.accentDeep,
    fontSize: 30,
    lineHeight: 36,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  ringCenter: {
    alignItems: 'center',
  },
  ringPct: {
    fontSize: 26,
    lineHeight: 30,
    color: colors.ink,
  },
  ringSub: {
    color: colors.textSecondary,
  },
  statStack: {
    flex: 1,
    gap: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lavenderMist,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  statValue: {
    color: colors.ink,
    minWidth: 16,
  },
  statLabel: {
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.md,
  },
  rows: {
    gap: 0,
  },
  meetings: {
    gap: spacing.md,
    paddingRight: screenPadding,
  },
  meetingCard: {
    borderRadius: radii.lg,
    gap: spacing.xs,
    padding: spacing.lg,
    minWidth: 150,
  },
  meetingTime: {
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  meetingTitle: {
    color: colors.ink,
  },
  meetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  meetingUntil: {
    color: colors.accentDeep,
    fontWeight: '600',
  },
  meetingAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  meetingAddLabel: {
    color: colors.accentDeep,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadows.floating,
  },
  focusIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusText: {
    flex: 1,
  },
  focusTitle: {
    color: '#FFFFFF',
  },
  focusSub: {
    color: 'rgba(255,255,255,0.7)',
  },
  captureDock: {
    paddingBottom: spacing.sm,
  },
  capturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    ...shadows.card,
  },
  captureText: {
    flex: 1,
  },
  mic: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.blushMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
