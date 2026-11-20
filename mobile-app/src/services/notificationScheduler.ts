import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Check if notifications are enabled in user settings.
 * Returns true if enabled or if no setting exists (default: enabled).
 */
async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem('flowtask-notifications-enabled');
    return value !== 'false'; // default: true
  } catch {
    return true;
  }
}

/**
 * Check if deadline alerts are enabled.
 */
async function areDeadlineAlertsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem('flowtask-deadline-alerts');
    return value !== 'false';
  } catch {
    return true;
  }
}

/**
 * Check if daily reminders are enabled.
 */
async function areDailyRemindersEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem('flowtask-daily-reminders');
    return value !== 'false';
  } catch {
    return true;
  }
}

export { areNotificationsEnabled, areDeadlineAlertsEnabled, areDailyRemindersEnabled };

// Expo weekday constants (Sunday=1, Monday=2, ..., Saturday=7)
const WEEKDAY_MONDAY = 2;
const WEEKDAY_TUESDAY = 3;
const WEEKDAY_WEDNESDAY = 4;
const WEEKDAY_THURSDAY = 5;
const WEEKDAY_FRIDAY = 6;
const WEEKDAYS = [WEEKDAY_MONDAY, WEEKDAY_TUESDAY, WEEKDAY_WEDNESDAY, WEEKDAY_THURSDAY, WEEKDAY_FRIDAY];

/**
 * Request notification permissions. Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C98664',
    });
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#E24848',
    });
    await Notifications.setNotificationChannelAsync('assignments', {
      name: 'Task Assignments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C98664',
    });
  }

  return true;
}

/**
 * Schedule a one-time notification for a task reminder.
 * Returns the notification identifier for later cancellation.
 */
export async function scheduleTaskReminder(params: {
  title: string;
  body: string;
  date: Date;
  taskId: string;
  channel?: string;
  deadlineAlert?: boolean;
}): Promise<string | null> {
  // Respect notification settings
  if (!(await areNotificationsEnabled())) return null;
  if (params.deadlineAlert && !(await areDeadlineAlertsEnabled())) return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const trigger = params.date.getTime();
  // Don't schedule in the past
  if (trigger <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: { taskId: params.taskId, type: 'task-reminder' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: params.channel || 'task-reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.date,
    },
  });

  return id;
}

/**
 * Schedule a daily recurring notification.
 * Returns the notification identifier.
 */
export async function scheduleDailyReminder(params: {
  title: string;
  body: string;
  hour: number;
  minute: number;
  taskId: string;
  channel?: string;
}): Promise<string | null> {
  // Respect notification settings
  if (!(await areNotificationsEnabled())) return null;
  if (!(await areDailyRemindersEnabled())) return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: params.title,
      body: params.body,
      data: { taskId: params.taskId, type: 'daily-reminder' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: params.channel || 'task-reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: params.hour,
      minute: params.minute,
    },
  });

  return id;
}

/**
 * Schedule weekday-only recurring notifications (Mon–Fri).
 * Uses 5 individual WEEKLY triggers, one per weekday.
 * Returns array of notification identifiers.
 */
export async function scheduleWeekdayReminders(params: {
  title: string;
  body: string;
  hour: number;
  minute: number;
  taskId: string;
  channel?: string;
}): Promise<string[]> {
  if (!(await areNotificationsEnabled())) return [];
  if (!(await areDailyRemindersEnabled())) return [];

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return [];

  const ids: string[] = [];
  for (const weekday of WEEKDAYS) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: { taskId: params.taskId, type: 'weekday-reminder' },
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: params.channel || 'task-reminders' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: params.hour,
          minute: params.minute,
        },
      });
      if (id) ids.push(id);
    } catch (err) {
      console.warn(`[Notifications] Failed to schedule weekday ${weekday} notification:`, err);
    }
  }
  return ids;
}

/**
 * Cancel a scheduled notification by identifier.
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications for a specific task.
 */
export async function cancelTaskNotifications(taskId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Send an immediate local notification for a received assignment.
 * This fires right away (not scheduled for the future).
 */
export async function sendImmediateAssignmentNotification(params: {
  senderName: string;
  taskTitle: string;
  dueDate: string | null;
  taskId: string;
}): Promise<boolean> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  const dueLabel = params.dueDate
    ? ` · Due ${new Date(params.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : '';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${params.senderName} assigned you a task`,
        body: `${params.taskTitle}${dueLabel}`,
        data: { taskId: params.taskId, type: 'task-assigned' },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'assignments' } : {}),
      },
      trigger: null, // null = deliver immediately
    });
    return true;
  } catch (err) {
    console.warn('[Notifications] Failed to send assignment notification:', err);
    return false;
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel only recurring (daily/weekday) notifications.
 * Preserves one-time task reminders and assignment notifications.
 */
export async function cancelRecurringNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    const type = notification.content.data?.type;
    if (type === 'daily-reminder' || type === 'weekday-reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Get all currently scheduled notifications.
 */
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add a listener for notification responses (when user taps a notification).
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add a listener for notifications received while app is in foreground.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}
