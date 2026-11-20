import { api, getApiErrorMessage } from './api';
import { TaskAssignment, AssignmentNotificationResult } from '../types';

export type AssignTaskResult = {
  assignment: TaskAssignment;
  task: any;
  recipient_is_user: boolean;
  notification: AssignmentNotificationResult;
  message: string;
};

/**
 * Send/assign a task to another user by email.
 * Returns the created assignment with notification status.
 */
export async function assignTask(params: {
  taskId: string;
  recipientEmail: string;
  message?: string;
}): Promise<AssignTaskResult> {
  try {
    const { data } = await api.post('/api/assignments', {
      task_id: params.taskId,
      recipient_email: params.recipientEmail.trim().toLowerCase(),
      message: params.message || null,
    });
    return data.data;
  } catch (error: any) {
    const detail = error?.response?.data?.error;
    if (typeof detail === 'string') throw new Error(detail);
    throw new Error(getApiErrorMessage(error, 'Could not send the task. Please try again.'));
  }
}

/**
 * Retry a failed email for an existing assignment.
 */
export async function retryAssignmentEmail(assignmentId: string): Promise<{ email_sent: boolean; email_provider: string; error: string | null }> {
  try {
    const { data } = await api.post(`/api/assignments/${assignmentId}/retry-email`);
    return data.data;
  } catch (error: any) {
    const detail = error?.response?.data?.error;
    if (typeof detail === 'string') throw new Error(detail);
    throw new Error(getApiErrorMessage(error, 'Could not retry email.'));
  }
}

/**
 * List assignments sent by the current user.
 */
export async function fetchSentAssignments(): Promise<TaskAssignment[]> {
  try {
    const { data } = await api.get('/api/assignments');
    return data?.data?.assignments || [];
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Could not load assignments.'));
  }
}

/**
 * List assignments received by the current user.
 */
export async function fetchReceivedAssignments(): Promise<TaskAssignment[]> {
  try {
    const { data } = await api.get('/api/assignments/received');
    return data?.data?.assignments || [];
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Could not load received assignments.'));
  }
}

/**
 * Accept a received assignment.
 */
export async function acceptAssignment(assignmentId: string): Promise<TaskAssignment> {
  try {
    const { data } = await api.post(`/api/assignments/${assignmentId}/accept`);
    return data.data.assignment;
  } catch (error: any) {
    const detail = error?.response?.data?.error;
    if (typeof detail === 'string') throw new Error(detail);
    throw new Error(getApiErrorMessage(error, 'Could not accept assignment.'));
  }
}

/**
 * Cancel a sent assignment.
 */
export async function cancelAssignment(assignmentId: string): Promise<TaskAssignment> {
  try {
    const { data } = await api.post(`/api/assignments/${assignmentId}/cancel`);
    return data.data.assignment;
  } catch (error: any) {
    const detail = error?.response?.data?.error;
    if (typeof detail === 'string') throw new Error(detail);
    throw new Error(getApiErrorMessage(error, 'Could not cancel assignment.'));
  }
}

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
