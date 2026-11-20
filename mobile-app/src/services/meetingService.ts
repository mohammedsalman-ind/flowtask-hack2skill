import axios from 'axios';
import { MeetingRecord, MeetingSummary } from '../types';
import { api } from './api';


function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidMeetingSummary(value: unknown): value is Pick<MeetingSummary, 'summary' | 'key_notes' | 'action_items' | 'participants'> {
  return (
    isRecord(value) &&
    typeof value.summary === 'string' &&
    Array.isArray(value.key_notes) &&
    Array.isArray(value.action_items)
  );
}

export async function analyzeMeeting(transcript: string, title: string): Promise<MeetingSummary> {
  if (!transcript.trim()) throw new Error('Paste meeting notes or a transcript first.');
  try {
    const { data } = await api.post('/api/ai/analyze-meeting', {
      transcript: transcript.trim(),
      title: title.trim() || 'Mobile meeting notes',
      input_type: 'transcript',
    }, { timeout: 90000 });
    const value = data?.data ?? data;
    if (!isValidMeetingSummary(value)) throw new Error('AI service returned an invalid response. Please try again.');
    return {
      summary: value.summary,
      key_notes: value.key_notes,
      action_items: value.action_items,
      participants: value.participants || [],
      risks: value.key_notes.filter((note) => note.category === 'blocker').map((note) => note.point),
      follow_ups: value.action_items.map((item) => item.task),
      important_deadlines: value.action_items.filter((item) => Boolean(item.due)).map((item) => `${item.task}: ${item.due}`),
    };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('invalid response')) throw error;
    const detail = error?.response?.data?.detail || error?.response?.data?.error;
    if (typeof detail === 'string') throw new Error(detail);
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') throw new Error('AI service timed out. Please try again.');
    throw new Error(error?.message || 'AI service failed. Please try again.');
  }
}

export async function analyzeTranscriptFile(uri: string, name: string, mimeType?: string, title?: string): Promise<MeetingSummary> {
  const formData = new FormData();
  formData.append('meeting_title', title?.trim() || name || 'Uploaded meeting');
  formData.append('file', { uri, name, type: mimeType || 'application/octet-stream' } as any);
  try {
    const { data } = await api.post('/api/ai/analyze-transcript', formData, { timeout: 120000 });
    const value = data?.data ?? data;
    const tasks = value?.tasks || [];
    return {
      summary: value?.summary || `${tasks.length} action item${tasks.length === 1 ? '' : 's'} extracted from ${name}.`,
      key_notes: value?.key_notes || [],
      action_items: tasks.map((task: any) => ({ task: task.title, assignee: task.assignee || 'Unassigned', due: task.due_date || null, priority: String(task.priority || 'medium').toLowerCase() })),
      participants: value?.participants || [],
      risks: [],
      follow_ups: tasks.map((task: any) => task.title),
      important_deadlines: tasks.filter((task: any) => task.due_date).map((task: any) => `${task.title}: ${task.due_date}`),
    };
  } catch (error: any) {
    const detail = error?.response?.data?.detail || error?.response?.data?.error;
    throw new Error(typeof detail === 'string' ? detail : 'The transcript could not be analyzed. Please try again.');
  }
}

export async function saveMeetingSummary(title: string, transcript: string, summary: MeetingSummary): Promise<MeetingRecord> {
  const { data } = await api.post('/api/meetings/save-analysis', {
    title: title.trim() || 'Untitled meeting',
    transcript,
    input_type: 'transcript',
    summary: summary.summary,
    key_notes: summary.key_notes,
    action_items: summary.action_items.map((item) => ({ task: item.task, assignee: item.assignee || 'Unassigned', due: item.due || null, priority: item.priority || 'medium' })),
    participants: summary.participants || [],
  });
  return data.data.meeting as MeetingRecord;
}

export async function fetchMeeting(id: string): Promise<MeetingRecord> {
  const { data } = await api.get(`/api/meetings/${id}`);
  return data.data.meeting as MeetingRecord;
}

export async function deleteMeeting(id: string): Promise<void> {
  await api.delete(`/api/meetings/${id}`);
}

export async function fetchRecentMeetings(limit = 20): Promise<MeetingRecord[]> {
  const { data } = await api.get('/api/meetings');
  return (data?.data?.meetings || []).slice(0, limit) as MeetingRecord[];
}

export async function createMeetingTasks(meetingId: string, actionItemIndices: number[]) {
  const { data } = await api.post(`/api/meetings/${meetingId}/create-tasks`, { action_item_indices: actionItemIndices });
  return (data?.data?.created_tasks || []) as any[];
}

export async function assignMeetingTask(meetingId: string, actionItemIndex: number, assigneeName: string): Promise<{ task: any; recipient_is_user: boolean; message: string }> {
  const { data } = await api.post(`/api/meetings/${meetingId}/assign-task`, {
    action_item_index: actionItemIndex,
    assignee_name: assigneeName.trim(),
  });
  return data.data;
}
