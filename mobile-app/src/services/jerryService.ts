import { api, getApiErrorMessage } from './api';
import { TaskContext, TaskPriority } from '../types';

export type JerryInputMode = 'text' | 'voice';
export type JerryQueryType = 'today' | 'tomorrow' | 'overdue' | 'pending' | 'this_week' | 'urgent' | 'completed' | 'upcoming' | 'assigned';
export type JerryIntentName = 'task_create' | 'task_query' | 'task_update' | 'task_complete' | 'task_delete' | 'meeting_query' | 'meeting_action_item_query' | 'greeting' | 'flowtask_help' | 'conversation' | 'out_of_scope' | 'unclear' | 'unknown';

export type JerryAction = {
  type: string;
  title?: string;
  due_date?: string | null;
  priority?: string;
  context?: string;
};

export type JerryResult = {
  success?: boolean;
  task?: any;
  tasks?: any[];
  matched?: any[];
  label?: string;
  meeting?: any;
  reason?: string;
  duplicate?: boolean;
  error?: boolean;
  taskId?: string;
  candidates?: { id: string; title: string }[];
};

export type JerryIntent = {
  intent: JerryIntentName;
  language: 'en' | 'hi';
  reply: string | null;
  action: JerryAction | null;
  result: JerryResult | null;
  // Legacy fields for backward compatibility
  query?: JerryQueryType | null;
  title?: string;
  due_date?: string | null;
  priority?: TaskPriority;
  tags?: string[];
  context?: TaskContext;
  input_mode: JerryInputMode;
  should_speak: boolean;
};

export async function classifyJerryCommand(text: string, inputMode: JerryInputMode = 'text'): Promise<JerryIntent> {
  if (!text.trim()) throw new Error('Tell Jerry what you need to do.');
  try {
    const { data } = await api.post<JerryIntent>('/api/ai/parse', {
      text: text.trim(),
      input_mode: inputMode,
    }, { timeout: 120000 });

    if (!data?.intent) throw new Error('Jerry returned an invalid response.');

    return {
      intent: data.intent || 'unknown',
      language: data.language === 'hi' ? 'hi' : 'en',
      reply: data.reply || null,
      action: data.action || null,
      result: data.result || null,
      query: data.query || null,
      title: data.action?.title || data.title || undefined,
      due_date: data.action?.due_date || data.due_date || undefined,
      priority: (data.action?.priority || data.priority || 'medium') as TaskPriority,
      tags: data.tags || [],
      context: (data.action?.context || data.context || 'personal') as TaskContext,
      input_mode: inputMode,
      should_speak: inputMode === 'voice',
    };
  } catch (error: any) {
    if (__DEV__) console.error('[Jerry] /api/ai/parse failed', error?.response?.data || error?.message);
    // Friendly error — never expose raw HTTP errors
    const errData = error?.response?.data;
    const errDetail = errData?.detail || errData?.error || errData?.message;
    if (typeof errDetail === 'string' && errDetail.trim()) {
      throw new Error(errDetail);
    }
    throw new Error(getApiErrorMessage(error, 'Jerry is temporarily unavailable. Please try again.'));
  }
}
