import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { SpaceDot } from '../components/feature/space-dot';
import { TaskRow } from '../components/feature/task-row';
import { AnimatedRing } from '../components/ui/animated-ring';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty-state';
import { IconButton } from '../components/ui/icon-button';
import { SectionHeader } from '../components/ui/section-header';
import { ErrorBanner } from '../components/ui';

import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { Task, TaskAssignment } from '../types';
import { fetchRecentMeetings } from '../services/meetingService';
import { fetchNotifications, markAllNotificationsRead } from '../services/notificationService';
import { sendImmediateAssignmentNotification } from '../services/notificationScheduler';
import { fetchReceivedAssignments } from '../services/assignmentService';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { isToday as isTodayDate, isOverdue as isTaskOverdue, isTodayTimestamp } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const planningStyle = user?.user_metadata?.flowtask_setup?.planningStyle;
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(120);
  const { tasks, loading, refreshing, error, loadTasks, refreshTasks, toggleTask } = useTasks();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingError, setMeetingError] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [receivedAssignments, setReceivedAssignments] = useState<TaskAssignment[]>([]);
  const seenNotifIdsRef = React.useRef(new Set<string>());

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userName = user?.user_metadata?.flowtask_setup?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'friend';

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  useFocusEffect(
    useCallback(() => {
      loadTasks('all');
      let active = true;

      fetchRecentMeetings(10)
        .then((items) => {
          if (active) {
            setMeetings(items);
            setMeetingError('');
          }
        })
        .catch((err) => {
          if (active) setMeetingError(err instanceof Error ? err.message : 'Unable to load meetings.');
        });

      fetchNotifications()
        .then((result) => {
          if (!active) return;
          setUnreadNotifications(result.unreadCount);
          for (const notif of result.notifications) {
            if (notif.type === 'task_assigned' && !seenNotifIdsRef.current.has(notif.id)) {
              seenNotifIdsRef.current.add(notif.id);
              if (!notif.is_read) {
                const titleMatch = notif.message.match(/"([^"]+)"/);
                const taskTitle = titleMatch ? titleMatch[1] : notif.message;
                const senderMatch = notif.message.match(/^(.+) assigned you/);
                const senderName = senderMatch ? senderMatch[1] : 'Someone';
                sendImmediateAssignmentNotification({
                  senderName,
                  taskTitle,
                  dueDate: null,
                  taskId: notif.reference_id || '',
                }).catch(() => {});
              }
            }
          }
        })
        .catch(() => undefined);

      fetchReceivedAssignments()
        .then((items) => {
          if (active) setReceivedAssignments(items.filter((a) => a.status === 'sent'));
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [loadTasks])
  );

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'done').length;
    const pending = tasks.length - completed;
    const today = tasks.filter((task) => isTodayDate(task.due_date) && task.status !== 'done');
    const completedToday = tasks.filter((task) => task.status === 'done' && isTodayTimestamp(task.updated_at || null)).length;
    const overdue = tasks.filter(isTaskOverdue);
    const upcoming = tasks.filter((task) => {
      if (!task.due_date || task.status === 'done') return false;
      const d = new Date(task.due_date);
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      return d.getTime() > now.getTime();
    });
    const score = tasks.length ? completed / tasks.length : 0;
    return { completed, pending, today, completedToday, overdue, upcoming, score };
  }, [tasks]);

  const handleNotificationPress = async () => {
    try {
      const result = await fetchNotifications();
      setUnreadNotifications(result.unreadCount);
      const latest = result.notifications.slice(0, 5);
      Alert.alert(
        'Notifications',
        latest.length ? latest.map((n) => `• ${n.message}`).join('\n\n') : 'No notifications right now.',
        [
          {
            text: 'Mark all read',
            onPress: async () => {
              await markAllNotificationsRead();
              setUnreadNotifications(0);
            },
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } catch (err) {
      Alert.alert('Notifications unavailable', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const handleToggle = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      toggleTask(target);
    }
  };

  const todayTasksList = useMemo(() => {
    // Show tasks due today first, then general open tasks up to 8 items
    const todayList = tasks.filter((t) => isTodayDate(t.due_date));
    if (planningStyle === 'structured') {
      return todayList.sort((a, b) => Date.parse(a.due_date!) - Date.parse(b.due_date!));
    }
    if (planningStyle === 'flexible') {
      return [...todayList, ...tasks.filter((task) => !task.due_date && task.status !== 'done')];
    }
    if (todayList.length > 0) return todayList;
    return tasks.slice(0, 8);
  }, [tasks, planningStyle]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => refreshTasks('all')}
          tintColor={colors.accent}
        />
      }>
      {/* Top greeting header — asymmetric, clean */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="micro" style={styles.dateEyebrow}>
            {dateLabel}
          </AppText>
          <AppText variant="display" style={styles.greeting}>
            {greeting},{' '}
            <AppText variant="displayItalic" style={styles.greetingAccent}>
              {userName}.
            </AppText>
          </AppText>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.iconWrap}>
            <IconButton
              icon="search-outline"
              label="Search tasks"
              onPress={() => navigation.navigate('Tasks')}
            />
          </View>
          <View style={styles.iconWrap}>
            <IconButton
              icon="notifications-outline"
              label="Notifications"
              onPress={handleNotificationPress}
            />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <AppText variant="micro" style={styles.badgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Hero cluster — progress ring left, stat stack right */}
      <Animated.View entering={FadeInDown.duration(450).springify().damping(16)} style={styles.hero}>
        <AnimatedRing size={116} strokeWidth={11} progress={stats.score}>
          <View style={styles.ringCenter}>
            <AppText variant="display" style={styles.ringPct}>
              {Math.round(stats.score * 100)}%
            </AppText>
            <AppText variant="caption" style={styles.ringSub}>
              {stats.completed} of {tasks.length} done
            </AppText>
          </View>
        </AnimatedRing>
        <View style={styles.statStack}>
          <StatChip icon="people-outline" label="Meetings" value={meetings.length} />
          <StatChip icon="time-outline" label="Pending" value={stats.pending} />
          <StatChip icon="alert-circle-outline" label="Overdue" value={stats.overdue.length} />
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Task"
          onPress={() => navigation.navigate('AddTask')}
          style={({ pressed }) => [styles.quickActionCard, pressed ? styles.pressed : null]}>
          <Ionicons name="add-circle-outline" size={18} color={colors.accentDeep} />
          <AppText variant="caption" style={styles.quickActionLabel}>Add Task</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calendar"
          onPress={() => navigation.navigate('Calendar')}
          style={({ pressed }) => [styles.quickActionCard, pressed ? styles.pressed : null]}>
          <Ionicons name="calendar-outline" size={18} color={colors.accentDeep} />
          <AppText variant="caption" style={styles.quickActionLabel}>Calendar</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Meeting"
          onPress={() => navigation.navigate('Meetings')}
          style={({ pressed }) => [styles.quickActionCard, pressed ? styles.pressed : null]}>
          <Ionicons name="people-outline" size={18} color={colors.accentDeep} />
          <AppText variant="caption" style={styles.quickActionLabel}>Meeting</AppText>
        </Pressable>
      </View>

      {/* Completed today tracker */}
      <View style={styles.completedTodayBar}>
        <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.accentDeep} />
        <AppText variant="caption" style={[styles.completedTodayLabel, { color: theme.muted }]}>
          Completed today
        </AppText>
        <AppText variant="subtitle" style={[styles.completedTodayValue, { color: theme.text }]}>
          {stats.completedToday} task{stats.completedToday === 1 ? '' : 's'}
        </AppText>
      </View>

      {error ? <ErrorBanner message={error} onRetry={() => refreshTasks('all')} /> : null}
      {meetingError ? <ErrorBanner message={meetingError} /> : null}

      {/* Overdue alert if any */}
      {stats.overdue.length > 0 && (
        <Animated.View entering={FadeIn.duration(350)} style={styles.overdueBanner}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <AppText variant="subtitle" style={styles.overdueText}>
            {stats.overdue.length} task{stats.overdue.length === 1 ? '' : 's'} past due
          </AppText>
          <Pressable onPress={() => navigation.navigate('Tasks', { filter: 'high' })}>
            <AppText variant="caption" style={styles.overdueAction}>
              View
            </AppText>
          </Pressable>
        </Animated.View>
      )}

      {/* Assigned to me */}
      {receivedAssignments.length > 0 && (
        <Animated.View entering={FadeIn.duration(350)}>
          <SectionHeader title="Assigned to me" actionLabel={`${receivedAssignments.length}`} />
          <View style={styles.assignmentList}>
            {receivedAssignments.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => navigation.navigate('TaskDetail', { taskId: a.task_id })}
                style={({ pressed }) => [styles.assignmentCard, pressed ? styles.pressed : null]}>
                <Ionicons name="paper-plane-outline" size={18} color={colors.accentDeep} />
                <View style={styles.assignmentContent}>
                  <AppText variant="subtitle" numberOfLines={1}>
                    {a.tasks?.title || 'Assigned task'}
                  </AppText>
                  <AppText variant="caption" style={styles.assignmentFrom}>
                    From {a.sender?.name || a.sender?.email || 'Teammate'}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Today's tasks */}
      <Animated.View entering={FadeIn.duration(350).delay(100)} style={styles.section}>
        <SectionHeader
          title="Today"
          actionLabel="All tasks"
          onAction={() => navigation.navigate('Tasks')}
        />
        {todayTasksList.length > 0 ? (
          <View style={styles.rows}>
            {todayTasksList.slice(0, 7).map((t, idx) => (
              <TaskRow
                key={t.id}
                task={t}
                divider={idx > 0}
                onToggle={handleToggle}
                onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            ringProgress={stats.score}
            title="A clear day."
            sub="No pending tasks scheduled for today. Capture a thought below."
          />
        )}
      </Animated.View>

      {/* Overdue section */}
      {stats.overdue.length > 0 && (
        <Animated.View entering={FadeIn.duration(350).delay(140)} style={styles.section}>
          <SectionHeader
            title="Overdue"
            actionLabel="View all"
            onAction={() => navigation.navigate('Tasks', { filter: 'high' })}
          />
          <View style={styles.rows}>
            {stats.overdue.slice(0, 4).map((t, idx) => (
              <TaskRow
                key={t.id}
                task={t}
                divider={idx > 0}
                onToggle={handleToggle}
                onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Upcoming section */}
      {stats.upcoming.length > 0 && (
        <Animated.View entering={FadeIn.duration(350).delay(160)} style={styles.section}>
          <SectionHeader
            title="Upcoming"
            actionLabel="View all"
            onAction={() => navigation.navigate('Tasks')}
          />
          <View style={styles.rows}>
            {stats.upcoming.slice(0, 4).map((t, idx) => (
              <TaskRow
                key={t.id}
                task={t}
                divider={idx > 0}
                onToggle={handleToggle}
                onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Meetings carousel */}
      <Animated.View entering={FadeIn.duration(350).delay(180)} style={styles.section}>
        <SectionHeader
          title="Meetings"
          actionLabel="Meeting AI"
          onAction={() => navigation.navigate('Meetings')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.meetings}>
          {meetings.slice(0, 4).map((m) => (
            <Pressable
              key={m.id}
              onPress={() => navigation.navigate('MeetingDetails', { meetingId: m.id })}>
              <Card elevated={false} style={styles.meetingCard}>
                <AppText variant="caption" style={styles.meetingTime}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </AppText>
                <AppText variant="subtitle" numberOfLines={1} style={styles.meetingTitle}>
                  {m.title || 'Meeting Notes'}
                </AppText>
                <View style={styles.meetingMeta}>
                  <SpaceDot spaceId="work" size={6} />
                  <AppText variant="caption" style={styles.meetingUntil}>
                    {m.task_count || m.action_items?.length || 0} action items
                  </AppText>
                </View>
              </Card>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New meeting"
            onPress={() => navigation.navigate('Meetings')}
            style={({ pressed }) => [styles.meetingCard, styles.meetingAdd, pressed ? styles.pressed : null]}>
            <Ionicons name="add" size={18} color={colors.accentDeep} />
            <AppText variant="caption" style={styles.meetingAddLabel}>
              New meeting
            </AppText>
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* Focus Mode ink card */}
      <Animated.View entering={FadeIn.duration(350).delay(240)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a focus session"
          onPress={() => navigation.navigate('FocusMode')}
          style={({ pressed }) => [styles.focusCard, pressed ? styles.pressed : null]}>
          <View style={styles.focusIcon}>
            <Ionicons name="timer-outline" size={22} color={colors.derived.onAccent} />
          </View>
          <View style={styles.focusText}>
            <AppText variant="heading" style={styles.focusTitle}>
              Focus Session
            </AppText>
            <AppText variant="caption" style={styles.focusSub}>
              25 min · deep work timer
            </AppText>
          </View>
          <Ionicons name="play" size={18} color={colors.accentDeep} />
        </Pressable>
      </Animated.View>

      {/* Quick capture thought pill */}
      <View style={styles.captureDock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture a thought"
          onPress={() => navigation.navigate('AddTask')}
          style={({ pressed }) => [styles.capturePill, pressed ? styles.pressed : null]}>
          <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
          <AppText variant="bodySecondary" style={styles.captureText}>
            Capture a thought…
          </AppText>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('Jerry');
            }}
            style={styles.mic}>
            <Ionicons name="mic-outline" size={16} color={colors.accentDeep} />
          </Pressable>
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
    paddingTop: 56,
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
    fontSize: 28,
    lineHeight: 34,
  },
  greetingAccent: {
    color: colors.accentDeep,
    fontSize: 28,
    lineHeight: 34,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
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
    fontSize: 24,
    lineHeight: 28,
    color: colors.ink,
  },
  ringSub: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  statStack: {
    flex: 1,
    gap: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  statValue: {
    color: colors.ink,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  quickActionLabel: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 12,
  },
  completedTodayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  completedTodayLabel: {
    fontSize: 13,
  },
  completedTodayValue: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blushMist,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  overdueText: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
  },
  overdueAction: {
    color: colors.danger,
    fontWeight: '700',
  },
  assignmentList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  assignmentContent: {
    flex: 1,
  },
  assignmentFrom: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    gap: spacing.xs,
  },
  rows: {
    marginTop: spacing.xs,
  },
  meetings: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  meetingCard: {
    width: 170,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: 0,
  },
  meetingTime: {
    color: colors.textSecondary,
  },
  meetingTitle: {
    color: colors.ink,
    fontSize: 15,
  },
  meetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  meetingUntil: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  meetingAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavenderMist,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.lavender,
  },
  meetingAddLabel: {
    color: colors.accentDeep,
    fontWeight: '600',
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  focusIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusText: {
    flex: 1,
  },
  focusTitle: {
    color: colors.ink,
    fontSize: 17,
  },
  focusSub: {
    color: colors.textSecondary,
  },
  captureDock: {
    marginTop: spacing.sm,
  },
  capturePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    ...shadows.card,
  },
  captureText: {
    flex: 1,
  },
  mic: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
