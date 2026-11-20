import { useTaskStore } from '../../store/taskStore';
import type { Context, Task as ApiTask, CreateTaskRequest } from '../../types';
import { colors } from '@/theme/colors';

export type TaskType = 'task' | 'reminder' | 'meeting' | 'focus' | 'note';

export type Task = {
  id: string;
  title: string;
  spaceId: string;
  boardId: string;
  type: TaskType;
  time?: string;
  dayOffset?: number;
  done: boolean;
  apiTask: ApiTask;
};

export type Board = { id: string; name: string; spaceId: string };
export type Space = { id: string; name: string; icon: string };

const contextOptions: { id: Context; name: string; icon: string; board: string; accent: string }[] = [
  { id: 'study', name: 'Study', icon: 'school-outline', board: 'Study list', accent: colors.mauve },
  { id: 'work', name: 'Work', icon: 'briefcase-outline', board: 'Work list', accent: colors.lavender },
  { id: 'personal', name: 'Personal', icon: 'home-outline', board: 'Personal list', accent: colors.accent },
  { id: 'health', name: 'Health', icon: 'heart-outline', board: 'Health list', accent: colors.accentDeep },
];

export const spaces: Space[] = contextOptions.map(({ id, name, icon }) => ({ id, name, icon }));
export const boards: Board[] = contextOptions.map(({ id, board }) => ({ id, name: board, spaceId: id }));
export const spaceAccents: Record<string, string> = Object.fromEntries(contextOptions.map(({ id, accent }) => [id, accent]));
export const tasks: Task[] = [];

const listeners = new Set<() => void>();
const typeTagPrefix = 'flowtask_type:';

function localDayOffset(value: string | null): number | undefined {
  if (!value) return undefined;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return undefined;
  const today = startOfToday();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
}

function mapTask(record: ApiTask): Task {
  const marker = record.tags?.find((tag) => tag.startsWith(typeTagPrefix));
  const type = (marker?.slice(typeTagPrefix.length) || 'task') as TaskType;
  const due = record.due_date ? new Date(record.due_date) : null;
  const time = due && !Number.isNaN(due.getTime())
    ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}`
    : undefined;
  const spaceId = record.context || 'personal';
  return {
    id: record.id,
    title: record.title,
    spaceId,
    boardId: spaceId,
    type: ['task', 'reminder', 'meeting', 'focus', 'note'].includes(type) ? type : 'task',
    time,
    dayOffset: localDayOffset(record.due_date),
    done: record.status === 'done',
    apiTask: record,
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function syncFromApiStore() {
  const records = useTaskStore.getState().tasks;
  tasks.splice(0, tasks.length, ...records.map(mapTask));
  emit();
}

useTaskStore.subscribe(syncFromApiStore);

export function subscribeToTasks(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type NewTaskInput = {
  title: string;
  type?: TaskType;
  spaceId?: string;
  boardId?: string;
  time?: string;
  dayOffset?: number;
  date?: string;
};

function dateWithTime(dayOffset: number, time: string): string {
  const date = startOfToday();
  date.setDate(date.getDate() + dayOffset);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toISOString();
}

function notifyError(message: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('flowtask:error', { detail: message }));
}

export async function addTask(input: NewTaskInput): Promise<Task> {
  const type = input.type ?? 'task';
  const context = contextOptions.some((option) => option.id === input.spaceId)
    ? input.spaceId as Context
    : 'personal';
  const dueDate = input.date
    ? new Date(input.date).toISOString()
    : input.time
      ? dateWithTime(input.dayOffset ?? 0, input.time)
      : null;
  const payload: CreateTaskRequest = {
    title: input.title.trim(),
    status: 'todo',
    priority: 'medium',
    context,
    recurrence: 'none',
    due_date: dueDate,
    tags: [`${typeTagPrefix}${type}`],
  };
  const created = await useTaskStore.getState().createTask(payload);
  if (!created) {
    const message = useTaskStore.getState().error || 'Could not save the task.';
    notifyError(message);
    throw new Error(message);
  }
  return mapTask(created);
}

export function toggleTask(id: string): void {
  const current = useTaskStore.getState().tasks.find((task) => task.id === id);
  if (current) void useTaskStore.getState().patchStatus(id, current.status === 'done' ? 'todo' : 'done');
}

export function setTaskTime(id: string, time: string | undefined): void {
  const current = tasks.find((task) => task.id === id);
  if (!current) return;
  const due_date = time ? dateWithTime(current.dayOffset ?? 0, time) : null;
  void useTaskStore.getState().updateTask(id, { due_date });
}

export function unscheduleTask(id: string): void {
  void useTaskStore.getState().updateTask(id, { due_date: null });
}

export function tasksForBoard(boardId: string): Task[] {
  return tasks.filter((task) => task.boardId === boardId);
}

export function boardsForSpace(spaceId: string | 'all'): Board[] {
  return spaceId === 'all' ? boards : boards.filter((board) => board.spaceId === spaceId);
}

export function todayTasks(): Task[] {
  return tasks.filter((task) => task.dayOffset === 0 || (!task.done && task.type === 'task'));
}

export function todayMeetings(): Task[] {
  return tasks.filter((task) => task.type === 'meeting' && task.dayOffset === 0);
}

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dayForOffset(offset: number): Date {
  const date = startOfToday();
  date.setDate(date.getDate() + offset);
  return date;
}

export function scheduledForOffset(offset: number): Task[] {
  return tasks.filter((task) => task.time !== undefined && task.dayOffset === offset)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

export function dayHasItems(offset: number): boolean {
  return tasks.some((task) => task.dayOffset === offset);
}

export function dayLabel(offset: number | undefined): string {
  if (offset === undefined) return 'Someday';
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return dayForOffset(offset).toLocaleString(undefined, { weekday: 'long' });
}

export function nextUpTask(): Task | undefined {
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return scheduledForOffset(0).find((task) => !task.done && task.type !== 'reminder' && (task.time ?? '') >= nowTime);
}

export function spaceName(id: string): string {
  return spaces.find((space) => space.id === id)?.name ?? id;
}

export function spaceAccent(id: string): string {
  return spaceAccents[id] ?? colors.mauve;
}

export function boardById(id: string): Board | undefined {
  return boards.find((board) => board.id === id);
}

export function boardName(id: string): string {
  return boardById(id)?.name ?? id;
}

export function findTask(id: string): Task | undefined {
  return tasks.find((task) => task.id === id);
}
