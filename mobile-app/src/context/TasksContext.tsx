import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  archiveTask as archiveTaskRequest,
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  duplicateTask as duplicateTaskRequest,
  fetchTasks,
  updateTask as updateTaskRequest,
  updateTaskStatus,
} from '../services/taskService';
import { scheduleNotificationsForTask, cancelTaskNotifications } from '../services/scheduleTaskNotifications';
import { scheduleMorningSummary } from '../services/morningNotification';
import { processRecurringTasks, findTasksNeedingOccurrences, buildOccurrenceInput, deduplicateOccurrences } from '../services/recurringTaskManager';
import { CreateTaskInput, Task, TaskFilter, TaskStatus, UpdateTaskInput } from '../types';

type TasksContextValue = {
  tasks: Task[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loadTasks: (filter?: TaskFilter) => Promise<Task[]>;
  refreshTasks: (filter?: TaskFilter) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  toggleTask: (task: Task) => Promise<void>;
  duplicateTask: (task: Task) => Promise<Task>;
  archiveTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  clearTasks: () => void;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const lastLoadRef = useRef(0);
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const generateMissingOccurrences = useCallback(async (currentTasks: Task[]) => {
    try {
      const needsOccurrences = findTasksNeedingOccurrences(currentTasks);
      if (needsOccurrences.length === 0) return currentTasks;

      const newTasks: Task[] = [];
      for (const { parentTask, missingDates } of needsOccurrences) {
        // Only generate today's occurrence to avoid creating too many at once
        const todayDate = new Date().toISOString().split('T')[0];
        const todayMissing = missingDates.filter((d) => d === todayDate);
        if (todayMissing.length === 0) continue;

        const input = buildOccurrenceInput(parentTask, todayMissing[0]);
        try {
          const newTask = await createTaskRequest(input);
          newTasks.push(newTask);
          // Schedule notification for the new occurrence
          scheduleNotificationsForTask(newTask).catch(() => {});
        } catch (err) {
          console.warn('[Tasks] Failed to create occurrence:', err);
        }
      }

      if (newTasks.length > 0) {
        return deduplicateOccurrences([...currentTasks, ...newTasks]);
      }
      return currentTasks;
    } catch (err) {
      console.warn('[Tasks] Occurrence generation failed:', err);
      return currentTasks;
    }
  }, []);

  const loadTasks = useCallback(async (filter: TaskFilter = 'all') => {
    if (loadingRef.current || Date.now() - lastLoadRef.current < 1200) return tasksRef.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      let nextTasks = await fetchTasks(filter);
      // Generate any missing daily occurrences
      nextTasks = await generateMissingOccurrences(nextTasks);
      setTasks(nextTasks);
      lastLoadRef.current = Date.now();
      // Schedule morning summary if this is a full load
      if (filter === 'all') {
        scheduleMorningSummary(nextTasks).catch(() => {});
      }
      return nextTasks;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tasks.');
      return tasksRef.current;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [generateMissingOccurrences]);

  const refreshTasks = useCallback(async (filter: TaskFilter = 'all') => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      let rawTasks = await fetchTasks(filter);
      // Generate any missing daily occurrences on refresh too
      rawTasks = await generateMissingOccurrences(rawTasks);
      const nextTasks = processRecurringTasks(rawTasks);
      setTasks(nextTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh tasks.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, generateMissingOccurrences]);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    const task = await createTaskRequest(input);
    setTasks((current) => [task, ...current]);
    // Schedule notifications asynchronously (don't block task creation)
    scheduleNotificationsForTask(task).catch(() => {});
    return task;
  }, []);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    const updated = await updateTaskRequest(id, input);
    setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
    // Re-schedule notifications for updated task
    scheduleNotificationsForTask(updated).catch(() => {});
    return updated;
  }, []);

  const toggleTask = useCallback(async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    const updated = await updateTaskStatus(task.id, nextStatus);
    setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    if (nextStatus === 'done') {
      cancelTaskNotifications(task.id).catch(() => {});
      // For any recurring task, the next occurrence will be generated on next load
    } else {
      scheduleNotificationsForTask(updated).catch(() => {});
    }
  }, []);

  const duplicateTask = useCallback(async (task: Task) => {
    const duplicated = await duplicateTaskRequest(task);
    setTasks((current) => [duplicated, ...current]);
    return duplicated;
  }, []);

  const archiveTask = useCallback(async (task: Task) => {
    await archiveTaskRequest(task);
    setTasks((current) => current.filter((item) => item.id !== task.id));
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await deleteTaskRequest(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    // Cancel all notifications for deleted task
    cancelTaskNotifications(id).catch(() => {});
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
    setLoading(false);
    setRefreshing(false);
    setError(null);
    loadingRef.current = false;
    lastLoadRef.current = 0;
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      loading,
      refreshing,
      error,
      loadTasks,
      refreshTasks,
      createTask,
      updateTask,
      toggleTask,
      duplicateTask,
      archiveTask,
      removeTask,
      clearTasks,
    }),
    [archiveTask, clearTasks, createTask, duplicateTask, error, loadTasks, loading, refreshTasks, refreshing, removeTask, tasks, toggleTask, updateTask]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within TasksProvider');
  }
  return context;
}
