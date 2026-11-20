import { useCallback, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import type { ApprovedTask, WorkspaceSnapshot, WorkspaceTask } from '../../../../../shared/types/workspace';

export type WorkspaceProps = { data: WorkspaceSnapshot; refresh: () => Promise<void> };

export function memberName(data: WorkspaceSnapshot, id: string | null) {
  const member = data.members.find((entry) => entry.user_id === id);
  return member?.name || member?.email || 'Former member';
}

export const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString() : 'No deadline';
export const messageFor = (error: unknown) => error instanceof Error ? error.message : 'The workspace request failed.';
export const jsonForm = (event: FormEvent<HTMLFormElement>) => Object.fromEntries(new FormData(event.currentTarget));
export const overdue = (task: WorkspaceTask) => task.organization_stage !== 'done' && !!task.due_date && Date.parse(task.due_date) < Date.now();
export const metricCounts = (tasks: WorkspaceTask[]) => ({
  total: tasks.length, complete: tasks.filter((task) => task.organization_stage === 'done').length, overdue: tasks.filter(overdue).length,
});

export function localInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export const toIso = (value: FormDataEntryValue | null) => value ? new Date(String(value)).toISOString() : null;

export function taskForm(event: FormEvent<HTMLFormElement>): ApprovedTask {
  const data = new FormData(event.currentTarget);
  return {
    title: String(data.get('title')), description: String(data.get('description')), user_id: String(data.get('user_id')),
    due_date: toIso(data.get('due_date')), priority: data.get('priority') as ApprovedTask['priority'],
    project_id: String(data.get('project_id') || '') || null,
  };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (job: () => Promise<void>, message?: string) => {
    setBusy(true);
    setError('');
    try {
      await job();
      if (message) toast.success(message);
    } catch (failure) { setError(messageFor(failure)); }
    finally { setBusy(false); }
  }, []);
  return { run, busy, error };
}
