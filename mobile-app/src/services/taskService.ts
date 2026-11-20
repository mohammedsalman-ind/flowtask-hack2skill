import { CreateTaskInput, Task, TaskFilter, TaskStatus, UpdateTaskInput } from '../types';
import { api } from './api';

/** Ensure every Task object has safe defaults for optional fields. */
function normalizeTask(task: Task): Task {
  return {
    ...task,
    description: task.description || '',
    tags: task.tags || [],
    due_date: task.due_date || null,
    recurrence: task.recurrence || 'none',
    context: task.context || 'personal',
    assignee: task.assignee || null,
    reminder_minutes: task.reminder_minutes ?? null,
    recurrence_end_date: task.recurrence_end_date || null,
    parent_task_id: task.parent_task_id || null,
  };
}

export async function fetchTasks(filter: TaskFilter = 'all'): Promise<Task[]> {
  const params = filter === 'pending'
    ? { status: 'todo' }
    : filter === 'completed'
      ? { status: 'done' }
      : filter === 'high'
        ? { priority: 'high' }
        : undefined;
  const { data } = await api.get('/api/tasks', { params });
  return (data?.data?.tasks || [])
    .map((task: Task) => normalizeTask(task))
    .filter((task: Task) => !task.tags.includes('archived'));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  try {
    const { data } = await api.post('/api/tasks', {
      ...input,
      description: input.description || '',
      context: input.context || 'work',
      recurrence: input.recurrence || 'none',
    });
    return normalizeTask(data.data.task as Task);
  } catch (err: any) {
    const apiErr = err?.response?.data?.error || err?.response?.data?.details?.map((d: any) => `${d.field}: ${d.message}`).join('; ');
    if (apiErr) throw new Error(apiErr);
    throw err;
  }
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const { data } = await api.patch(`/api/tasks/${id}/status`, { status });
  return normalizeTask(data.data.task as Task);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  try {
    const { data } = await api.put(`/api/tasks/${id}`, input);
    return normalizeTask(data.data.task as Task);
  } catch (err: any) {
    const apiErr = err?.response?.data?.error || err?.response?.data?.details?.map((d: any) => `${d.field}: ${d.message}`).join('; ');
    if (apiErr) throw new Error(apiErr);
    throw err;
  }
}

export async function duplicateTask(task: Task): Promise<Task> {
  return createTask({
    title: `${task.title} copy`,
    description: task.description,
    due_date: task.due_date,
    priority: task.priority,
    status: 'todo',
    tags: task.tags.filter((tag) => tag !== 'archived'),
    assignee: task.assignee || null,
  });
}

export async function archiveTask(task: Task): Promise<Task> {
  const tags = Array.from(new Set([...task.tags, 'archived']));
  return updateTask(task.id, { tags });
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/api/tasks/${id}`);
}
