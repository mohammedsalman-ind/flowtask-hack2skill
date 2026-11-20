import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  areNotificationsEnabled,
  areDailyRemindersEnabled,
} from './notificationScheduler';

const MORNING_SUMMARY_SENT_KEY = 'flowtask-morning-summary-last';
const MORNING_SUMMARY_NOTIF_KEY = 'flowtask-morning-summary-notif-id';
const MORNING_MINUTE = 0;

async function getMorningHour(): Promise<number> {
  const saved = await AsyncStorage.getItem('flowtask-morning-hour');
  const hour = saved === null ? NaN : Number(saved);
  return Number.isInteger(hour) && hour >= 4 && hour <= 11 ? hour : 8;
}

/**
 * Get today's date string in YYYY-MM-DD format (local timezone).
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if the morning summary was already sent today.
 */
async function wasMorningSummarySentToday(): Promise<boolean> {
  try {
    const lastSent = await AsyncStorage.getItem(MORNING_SUMMARY_SENT_KEY);
    return lastSent === getTodayDateString();
  } catch {
    return false;
  }
}

/**
 * Mark the morning summary as sent for today.
 */
async function markMorningSummarySent(): Promise<void> {
  try {
    await AsyncStorage.setItem(MORNING_SUMMARY_SENT_KEY, getTodayDateString());
  } catch { /* Non-fatal */ }
}

/**
 * Cancel the existing morning summary notification if one is scheduled.
 */
export async function cancelExistingMorningSummary(): Promise<void> {
  try {
    const existingId = await AsyncStorage.getItem(MORNING_SUMMARY_NOTIF_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(MORNING_SUMMARY_NOTIF_KEY);
    }
  } catch { /* Non-fatal */ }
}

/**
 * Schedule the morning summary at the saved local hour, defaulting to 8 AM.
 * Force an update when the user changes their reminder settings.
 */
export async function scheduleMorningSummary(tasks: {
  title: string;
  due_date: string | null;
  status: string;
}[], force = false): Promise<void> {
  try {
    // Check settings
    if (!(await areNotificationsEnabled())) return;
    if (!(await areDailyRemindersEnabled())) return;

    // Ensure permission
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    // Calculate pending and overdue counts from current tasks
    const now = new Date();
    const todayStr = now.toDateString();

    const pendingToday = tasks.filter(
      (t) => t.status !== 'done' && t.due_date && new Date(t.due_date).toDateString() === todayStr
    );
    const overdue = tasks.filter(
      (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < now && new Date(t.due_date).toDateString() !== todayStr
    );

    // Don't schedule if there's nothing to report
    if (pendingToday.length === 0 && overdue.length === 0) {
      // Still cancel any stale morning notification if no tasks
      await cancelExistingMorningSummary();
      return;
    }

    // If already sent today, don't re-schedule for today.
    // But ensure the DAILY trigger is active for future days.
    if (!force && await wasMorningSummarySentToday()) {
      // Ensure daily trigger exists for tomorrow+ (re-schedule if missing)
      await ensureDailyMorningTrigger();
      return;
    }

    // Build summary message
    const parts: string[] = [];
    if (pendingToday.length > 0) {
      parts.push(`${pendingToday.length} task${pendingToday.length === 1 ? '' : 's'} today`);
    }
    if (overdue.length > 0) {
      parts.push(`${overdue.length} overdue`);
    }
    const body = `You have ${parts.join(' and ')}.`;

    // Pick top 3 most urgent tasks
    const urgentTasks = [...overdue.slice(0, 2), ...pendingToday.slice(0, 2)];
    const taskNames = urgentTasks
      .slice(0, 3)
      .map((t) => t.title)
      .join(', ');
    const fullBody = taskNames ? `${body}\nTop: ${taskNames}` : body;

    // Cancel any existing morning notification first
    await cancelExistingMorningSummary();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Good morning!',
        body: fullBody,
        data: { taskId: 'morning-summary', type: 'morning-summary' },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: await getMorningHour(),
        minute: MORNING_MINUTE,
      },
    });

    // Store the notification ID for future cancellation
    if (id) {
      await AsyncStorage.setItem(MORNING_SUMMARY_NOTIF_KEY, id);
    }

    await markMorningSummarySent();
  } catch (err) {
    console.warn('[Notifications] Failed to schedule morning summary:', err);
  }
}

/**
 * Ensure the daily morning trigger is active.
 * If no morning notification is scheduled, restore the daily trigger.
 */
async function ensureDailyMorningTrigger(): Promise<void> {
  try {
    const existingId = await AsyncStorage.getItem(MORNING_SUMMARY_NOTIF_KEY);
    if (existingId) {
      // Verify it still exists in scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const stillScheduled = scheduled.some((n) => n.identifier === existingId);
      if (stillScheduled) return; // Already active
    }

    // No active trigger — schedule one for tomorrow
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Good morning!',
        body: 'Check your tasks for today.',
        data: { taskId: 'morning-summary', type: 'morning-summary' },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: await getMorningHour(),
        minute: MORNING_MINUTE,
      },
    });

    if (id) {
      await AsyncStorage.setItem(MORNING_SUMMARY_NOTIF_KEY, id);
    }
  } catch { /* Non-fatal */ }
}

/**
 * Request notification permissions on app startup.
 * Logs the result but does not block the app.
 */
export async function initializeNotifications(): Promise<boolean> {
  try {
    if (!(await areNotificationsEnabled())) return false;
    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.log('[Notifications] Permission not granted. Notifications will not be scheduled.');
    }
    return granted;
  } catch (err) {
    console.warn('[Notifications] Failed to request permissions:', err);
    return false;
  }
}
