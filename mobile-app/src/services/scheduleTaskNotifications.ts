import { scheduleTaskReminder, scheduleDailyReminder, scheduleWeekdayReminders, cancelTaskNotifications, areDeadlineAlertsEnabled } from './notificationScheduler';
export { cancelTaskNotifications };
import { Task } from '../types';

/**
 * Schedule notifications for a task based on its due_date, recurrence, and reminder settings.
 * Returns the scheduled notification IDs (stored for later cancellation).
 *
 * Notification strategy:
 * - If reminder_minutes is set: schedule a single reminder at (due_date - reminder_minutes)
 * - If no reminder_minutes: schedule deadline warning (1 day before) + 1 hour before + at deadline
 * - Daily recurring tasks also get a daily trigger at the due time
 * All past-date scheduling is guarded — no notifications are scheduled in the past.
 */
export async function scheduleNotificationsForTask(task: Task): Promise<string[]> {
  const ids: string[] = [];

  // Cancel any existing notifications for this task first (prevents duplicates)
  await cancelTaskNotifications(task.id);

  // Don't schedule for completed tasks
  if (task.status === 'done' || !(await areDeadlineAlertsEnabled())) return ids;

  const now = Date.now();

  // Schedule deadline notifications for tasks with due dates
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const dueTime = dueDate.getTime();

    // Only schedule if the due date is in the future
    if (dueTime > now) {
      if (task.reminder_minutes != null && task.reminder_minutes >= 0) {
        // Custom reminder: schedule a single notification at (due_time - reminder_minutes)
        const reminderTime = new Date(dueTime - task.reminder_minutes * 60 * 1000);
        if (reminderTime.getTime() > now) {
          const label = task.reminder_minutes === 0
            ? 'at due time'
            : task.reminder_minutes < 60
              ? `in ${task.reminder_minutes} min`
              : task.reminder_minutes === 60
                ? 'in 1 hour'
                : task.reminder_minutes === 1440
                  ? 'tomorrow'
                  : `in ${Math.round(task.reminder_minutes / 60)} hours`;
          const id = await scheduleTaskReminder({
            title: task.reminder_minutes === 0 ? '📌 Task due now' : '🔔 Task reminder',
            body: task.reminder_minutes === 0
              ? `"${task.title}" is due now`
              : `"${task.title}" — ${label}`,
            date: reminderTime,
            taskId: task.id,
            channel: task.reminder_minutes === 0 ? 'alarms' : 'task-reminders',
          });
          if (id) ids.push(id);
        }
      } else {
        // Default: deadline warning chain
        // Notification 1 day before deadline
        const oneDayBefore = new Date(dueTime - 24 * 60 * 60 * 1000);
        if (oneDayBefore.getTime() > now) {
          const id = await scheduleTaskReminder({
            title: '⏳ Deadline tomorrow',
            body: `"${task.title}" is due tomorrow`,
            date: oneDayBefore,
            taskId: task.id,
          });
          if (id) ids.push(id);
        }

        // Notification 1 hour before deadline
        const oneHourBefore = new Date(dueTime - 60 * 60 * 1000);
        if (oneHourBefore.getTime() > now) {
          const id = await scheduleTaskReminder({
            title: '⏰ Deadline approaching',
            body: `"${task.title}" is due in 1 hour`,
            date: oneHourBefore,
            taskId: task.id,
          });
          if (id) ids.push(id);
        }

        // Notification at deadline
        const id = await scheduleTaskReminder({
          title: '📌 Task due now',
          body: `"${task.title}" is due now`,
          date: dueDate,
          taskId: task.id,
        });
        if (id) ids.push(id);
      }
    }
  }

  // Schedule recurring daily reminders for tasks with recurrence
  if (task.recurrence && task.recurrence !== 'none' && task.due_date) {
    // Check if recurrence has expired — don't schedule beyond the end date
    if (task.recurrence_end_date) {
      const endDate = new Date(task.recurrence_end_date);
      endDate.setHours(23, 59, 59, 999);
      if (new Date() > endDate) return ids; // Recurrence expired, skip scheduling
    }

    const dueDate = new Date(task.due_date);
    const hour = dueDate.getHours() || 9; // Default to 9 AM
    const minute = dueDate.getMinutes() || 0;

    // For daily, use Expo's DAILY trigger (fires every day)
    if (task.recurrence === 'daily') {
      const id = await scheduleDailyReminder({
        title: '📋 Daily task reminder',
        body: `Time to work on "${task.title}"`,
        hour,
        minute,
        taskId: task.id,
      });
      if (id) ids.push(id);
    }
    // For weekdays, use 5 individual WEEKLY triggers (Mon–Fri only)
    else if (task.recurrence === 'weekdays') {
      const weekdayIds = await scheduleWeekdayReminders({
        title: '📋 Weekday task reminder',
        body: `Time to work on "${task.title}"`,
        hour,
        minute,
        taskId: task.id,
      });
      ids.push(...weekdayIds);
    }
    // For weekly/monthly, schedule next occurrence as one-time
    else if (task.recurrence === 'weekly' || task.recurrence === 'monthly') {
      if (dueDate.getTime() > now) {
        const id = await scheduleTaskReminder({
          title: '📋 Recurring task reminder',
          body: `Time to work on "${task.title}"`,
          date: dueDate,
          taskId: task.id,
        });
        if (id) ids.push(id);
      }
    }
  }

  return ids;
}

/**
 * Schedule notifications for overdue tasks (deadline approaching).
 */
export async function scheduleOverdueNotifications(tasks: Task[]): Promise<void> {
  for (const task of tasks) {
    if (task.status !== 'done' && task.due_date) {
      await scheduleNotificationsForTask(task);
    }
  }
}
