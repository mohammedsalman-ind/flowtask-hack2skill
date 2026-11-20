import { Task, CreateTaskInput, RecurrenceType } from '../types';

/**
 * Get the next date for a given recurrence type.
 */
function getNextOccurrenceDate(dueDate: Date, recurrence: RecurrenceType): Date {
  const next = new Date(dueDate);

  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;

    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;

    case 'weekdays': {
      // Skip to next weekday (Mon-Fri)
      next.setDate(next.getDate() + 1);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }

    default:
      return next;
  }

  return next;
}

/**
 * Check if a recurrence has an end date and if we've passed it.
 */
function isRecurrenceExpired(task: Task): boolean {
  if (!task.recurrence_end_date) return false;
  const endDate = new Date(task.recurrence_end_date);
  endDate.setHours(23, 59, 59, 999);
  return new Date() > endDate;
}

/**
 * Get all missing occurrence dates for a recurring task.
 * Only generates up to today (doesn't create future occurrences).
 */
export function getMissingOccurrenceDates(task: Task): string[] {
  const recurrence = task.recurrence;
  if (!recurrence || recurrence === 'none') return [];
  if (!task.due_date) return [];
  if (isRecurrenceExpired(task)) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDue = new Date(task.due_date);
  lastDue.setHours(0, 0, 0, 0);

  // If the last occurrence is today or in the future, no new occurrence needed
  if (lastDue.getTime() >= today.getTime()) return [];

  const missingDates: string[] = [];
  const nextDate = getNextOccurrenceDate(lastDue, recurrence);

  // Cap at 30 occurrences to prevent infinite loops
  let count = 0;
  while (nextDate.getTime() <= today.getTime() && count < 30) {
    // Check end date
    if (task.recurrence_end_date) {
      const endDate = new Date(task.recurrence_end_date);
      endDate.setHours(23, 59, 59, 999);
      if (nextDate > endDate) break;
    }

    missingDates.push(nextDate.toISOString().split('T')[0]);
    const nextIter = getNextOccurrenceDate(nextDate, recurrence);
    nextDate.setTime(nextIter.getTime());
    count++;
  }

  return missingDates;
}

/**
 * Build a CreateTaskInput for the next occurrence from a parent task.
 */
export function buildOccurrenceInput(parentTask: Task, occurrenceDate: string): CreateTaskInput {
  // Extract time from the parent's due_date, preserve it
  let timeSuffix = 'T09:00:00.000Z'; // default 9 AM
  if (parentTask.due_date) {
    const match = parentTask.due_date.match(/T(\d{2}:\d{2})/);
    if (match) {
      timeSuffix = `T${match[1]}:00.000Z`;
    }
  }

  return {
    title: parentTask.title,
    description: parentTask.description || '',
    status: 'todo',
    priority: parentTask.priority,
    tags: parentTask.tags || [],
    due_date: `${occurrenceDate}${timeSuffix}`,
    context: parentTask.context,
    recurrence: parentTask.recurrence,
    recurrence_end_date: parentTask.recurrence_end_date || null,
    parent_task_id: parentTask.id,
    assignee: parentTask.assignee || null,
  };
}

/**
 * Find tasks that need new occurrences generated.
 */
export function findTasksNeedingOccurrences(tasks: Task[]): Array<{ parentTask: Task; missingDates: string[] }> {
  const result: Array<{ parentTask: Task; missingDates: string[] }> = [];

  // Find parent tasks (tasks with recurrence set and no parent_task_id)
  const parentTasks = tasks.filter(
    (t) => t.recurrence && t.recurrence !== 'none' && !t.parent_task_id && t.status !== 'done'
  );

  for (const parentTask of parentTasks) {
    const missingDates = getMissingOccurrenceDates(parentTask);
    if (missingDates.length > 0) {
      result.push({ parentTask, missingDates });
    }
  }

  // Also check child occurrences that might need their own next occurrence
  const childOccurrences = tasks.filter(
    (t) => t.recurrence && t.recurrence !== 'none' && t.parent_task_id && t.status !== 'done'
  );

  for (const child of childOccurrences) {
    const missingDates = getMissingOccurrenceDates(child);
    if (missingDates.length > 0) {
      result.push({ parentTask: child, missingDates });
    }
  }

  return result;
}

/**
 * Check if two tasks represent the same occurrence (for duplicate prevention).
 */
export function isSameOccurrence(a: Task, b: Task): boolean {
  if (a.parent_task_id && b.parent_task_id) {
    return a.parent_task_id === b.parent_task_id && a.due_date === b.due_date;
  }
  return a.id === b.id;
}

/**
 * Deduplicate occurrences — keep only one task per parent_task_id + due_date.
 */
export function deduplicateOccurrences(tasks: Task[]): Task[] {
  const seen = new Map<string, Task>();
  const result: Task[] = [];

  for (const task of tasks) {
    if (task.parent_task_id && task.due_date) {
      const key = `${task.parent_task_id}:${task.due_date.split('T')[0]}`;
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        if (task.status === 'todo' && existing.status === 'done') {
          result[result.indexOf(existing)] = task;
          seen.set(key, task);
        }
        continue;
      }
      seen.set(key, task);
    }
    result.push(task);
  }

  return result;
}

/**
 * Process tasks for display — now just returns tasks unchanged
 * since occurrences are real database rows.
 */
export function processRecurringTasks(tasks: Task[], _today?: string): Task[] {
  return tasks;
}

// Legacy no-ops for backward compatibility
export function shouldResetRecurringTask(_task: Task, _today?: string): boolean {
  return false;
}

export async function markRecurringCompleted(_taskId: string): Promise<void> {}
export async function clearRecurringCompleted(_taskId: string): Promise<void> {}
