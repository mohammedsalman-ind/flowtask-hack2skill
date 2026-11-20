/**
 * Shared date utilities for FlowTask.
 *
 * All tasks are stored with TIMESTAMPTZ in Supabase. This module provides
 * timezone-safe helpers that compare dates using LOCAL calendar day parts
 * (year, month, day) instead of fragile string comparison.
 *
 * The user's device timezone is always respected.
 */

/** Get the local date key as "YYYY-MM-DD" using the device's timezone. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check whether a due_date string falls on today's local calendar day.
 *
 * This is timezone-safe: it extracts year/month/day from the Date object
 * (which JavaScript resolves to the local timezone) and compares with
 * today's year/month/day.
 */
export function isToday(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const taskDate = new Date(value);
    if (Number.isNaN(taskDate.getTime())) return false;
    return localDateKey(taskDate) === localDateKey(new Date());
  } catch {
    return false;
  }
}

/**
 * Check whether a task is overdue: has a due_date in the past and is not done.
 * Uses local calendar day — a task due today at 11 PM is NOT overdue at noon.
 */
export function isOverdue(task: { due_date: string | null | undefined; status: string }): boolean {
  if (!task.due_date || task.status === 'done') return false;
  try {
    const dueDate = new Date(task.due_date);
    if (Number.isNaN(dueDate.getTime())) return false;
    const now = new Date();
    // Compare using local date keys — overdue means the due date's local day
    // is strictly BEFORE today's local day.
    return localDateKey(dueDate) < localDateKey(now);
  } catch {
    return false;
  }
}

/**
 * Check whether a task is upcoming: due_date is in the future (after today).
 */
export function isUpcoming(task: { due_date: string | null | undefined; status: string }): boolean {
  if (!task.due_date || task.status === 'done') return false;
  try {
    const dueDate = new Date(task.due_date);
    if (Number.isNaN(dueDate.getTime())) return false;
    return localDateKey(dueDate) > localDateKey(new Date());
  } catch {
    return false;
  }
}

/**
 * Check whether a timestamp falls on today (for updated_at, created_at, etc.).
 */
export function isTodayTimestamp(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return localDateKey(date) === localDateKey(new Date());
  } catch {
    return false;
  }
}

/**
 * Format a due_date for display.
 */
export function formatDueDate(dueDate: string | null | undefined): string {
  if (!dueDate) return 'No due date';
  try {
    const date = new Date(dueDate);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}
