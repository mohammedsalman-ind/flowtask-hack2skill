import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { supabaseAdmin, createUserClient } from '../db/supabase.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendAssignmentPushNotification } from '../services/pushNotificationService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const getMlApiUrl = () => (process.env.ML_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
router.use(authMiddleware);

const createMeetingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500),
  transcript: z.string().min(1, 'Transcript is required'),
  input_type: z.enum(['transcript', 'recording']).default('transcript'),
});
const saveAnalysisSchema = z.object({
  title: z.string().trim().min(1).max(500),
  transcript: z.string().default(''),
  input_type: z.enum(['transcript', 'recording']).default('transcript'),
  summary: z.string().default(''),
  key_notes: z.array(z.object({ point: z.string(), category: z.string() })).default([]),
  action_items: z.array(z.object({ task: z.string().min(1), assignee: z.string().optional().default('Unassigned'), due: z.string().nullable().optional(), priority: z.enum(['high', 'medium', 'low']).optional().default('medium') })).default([]),
  participants: z.array(z.string()).default([]),
});
const createTasksSchema = z.object({ action_item_indices: z.array(z.number().int().min(0)).min(1) });
const assignTaskSchema = z.object({
  action_item_index: z.number().int().min(0),
  assignee_name: z.string().trim().min(1, 'Assignee name is required').max(200),
});

async function notifyAssignee(task: any, currentUserId: string) {
  const assignee = typeof task.assignee === 'string' ? task.assignee.trim() : '';
  if (!assignee || ['self', 'unassigned'].includes(assignee.toLowerCase())) return;
  let query = supabaseAdmin.from('users').select('id,email,name').limit(1);
  query = assignee.includes('@') ? query.ilike('email', assignee) : query.ilike('name', assignee);
  const { data } = await query;
  const recipient = data?.[0];
  if (!recipient || recipient.id === currentUserId) return;
  await supabaseAdmin.from('notifications').insert({ user_id: recipient.id, message: `You were assigned the task "${task.title}".`, type: 'task_assigned', reference_id: task.id, is_read: false });
}

async function assignTaskFromMeeting(userId: string, meeting: any, actionItemIndex: number, assigneeName: string, userClient?: any) {
  const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : [];
  const item = actionItems[actionItemIndex];
  if (!item) throw new Error('Action item not found');

  const taskPayload = {
    user_id: userId,
    meeting_id: meeting.id,
    title: String(item.task || item.title || item.description || 'Untitled task').trim(),
    description: `From meeting: ${meeting.title} — Assigned to ${assigneeName}`,
    status: 'todo' as const,
    priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
    tags: ['meeting', 'ai-action', 'assigned'],
    due_date: item.due || item.due_date || item.deadline || null,
    context: 'work' as const,
    recurrence: 'none' as const,
    assignee: assigneeName,
  };

  const client = userClient || supabaseAdmin;
  const { data: task, error: taskError } = await client.from('tasks').insert(taskPayload).select().single();
  if (taskError || !task) throw new Error('Failed to create task: ' + (taskError?.message || 'unknown'));

  // Look up if the assignee is an existing FlowTask user by name
  const { data: matchedUsers } = await supabaseAdmin
    .from('users')
    .select('id, email, name')
    .ilike('name', assigneeName)
    .limit(5);

  const matchedUser = matchedUsers?.find((u) => u.id !== userId) || null;
  let recipientIsUser = false;

  if (matchedUser) {
    // Create task assignment record
    const { error: assignError } = await supabaseAdmin
      .from('task_assignments')
      .insert({
        task_id: task.id,
        sender_user_id: userId,
        recipient_user_id: matchedUser.id,
        recipient_email: matchedUser.email,
        status: 'sent',
        message: null,
      });

    if (!assignError) {
      recipientIsUser = true;
      // Create in-app notification for the recipient
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: matchedUser.id,
          message: `You were assigned the task "${task.title}" from a meeting.`,
          type: 'task_assigned',
          reference_id: task.id,
          is_read: false,
        });
      } catch { /* notification failure is non-fatal */ }
      // Remote push notification to recipient's device(s)
      const senderProfile = (await supabaseAdmin.from('users').select('name').eq('id', userId).single()).data;
      sendAssignmentPushNotification({
        recipientUserId: matchedUser.id,
        senderName: senderProfile?.name || 'Someone',
        taskTitle: task.title,
        taskDueDate: task.due_date || null,
        taskId: task.id,
      }).catch((err) => console.warn('[Meetings] Push notification failed:', err));
    }
  }

  // Update meeting's tasks_created list
  const existing = Array.isArray(meeting.tasks_created) ? meeting.tasks_created : [];
  const ids = [...existing, task.id];
  await client.from('meetings').update({ tasks_created: ids, task_count: ids.length }).eq('id', meeting.id);

  return { task, recipient_is_user: recipientIsUser };
}

async function createTasksForMeeting(userId: string, meeting: any, indices: number[], userClient?: any) {
  const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : [];
  const createdTasks: any[] = [];
  const client = userClient || supabaseAdmin;
  for (const idx of indices) {
    if (idx < 0 || idx >= actionItems.length) continue;
    const item = actionItems[idx] || {};
    const taskPayload = {
      user_id: userId,
      meeting_id: meeting.id,
      title: String(item.task || item.title || item.description || 'Untitled task').trim(),
      description: `From meeting: ${meeting.title}`,
      status: 'todo' as const,
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
      tags: ['meeting', 'ai-action'],
      due_date: item.due || item.due_date || item.deadline || null,
      context: 'work' as const,
      recurrence: 'none' as const,
      assignee: item.assignee || item.owner || 'Unassigned',
    };
    const { data: task, error } = await client.from('tasks').insert(taskPayload).select().single();
    if (error) {
      console.error('[Meetings] Task insert error:', error.message);
      throw error;
    }
    createdTasks.push(task);
    await notifyAssignee(task, userId).catch((err) => console.warn('Meeting assignee notification failed:', err));
  }
  const existing = Array.isArray(meeting.tasks_created) ? meeting.tasks_created : [];
  const ids = [...existing, ...createdTasks.map((task) => task.id)];
  await client.from('meetings').update({ tasks_created: ids, task_count: ids.length }).eq('id', meeting.id);
  return createdTasks;
}

function normalizeAnalysisPayload(payload: any) {
  const actionItems = Array.isArray(payload?.action_items) ? payload.action_items : [];
  const legacyTasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  const normalizedActions = actionItems.length ? actionItems : legacyTasks.map((task: any) => ({
    task: task.task || task.title || task.description || 'Untitled task',
    assignee: task.assignee || task.owner || 'Unassigned',
    due: task.due || task.due_date || task.deadline || null,
    priority: String(task.priority || 'medium').toLowerCase(),
  }));
  return {
    ...payload,
    summary: typeof payload?.summary === 'string' && payload.summary.trim() ? payload.summary : 'Meeting transcript analyzed successfully.',
    key_notes: Array.isArray(payload?.key_notes) ? payload.key_notes : [],
    action_items: normalizedActions,
  };
}

router.post('/analyze', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const meetingTitle = String(req.body.meeting_title || '').trim();
    if (!meetingTitle) { res.status(400).json({ data: null, error: 'Meeting title is required', status: 400 }); return; }
    if (!req.file) { res.status(400).json({ data: null, error: 'No transcript file provided', status: 400 }); return; }
    const formData = new FormData();
    formData.append('meeting_title', meetingTitle);
    formData.append('file', new Blob([req.file.buffer as unknown as BlobPart], { type: req.file.mimetype }), req.file.originalname);
    const mlResponse = await fetch(`${getMlApiUrl()}/api/ml/analyze-transcript`, { method: 'POST', body: formData });
    const text = await mlResponse.text();
    let payload: any; try { payload = JSON.parse(text); } catch { payload = { detail: text }; }
    if (!mlResponse.ok) { res.status(mlResponse.status).json({ data: null, error: payload?.detail || 'AI analysis service failed', status: mlResponse.status }); return; }
    res.status(200).json({ data: normalizeAnalysisPayload(payload), error: null, status: 200 });
  } catch (err) {
    console.error('POST /meetings/analyze error:', err);
    res.status(502).json({ data: null, error: 'AI analysis service is unavailable.', status: 502 });
  }
});

router.post('/save-analysis', validate(saveAnalysisSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const payload = req.body as z.infer<typeof saveAnalysisSchema>;
    const client = createUserClient(req.accessToken!);
    const { data: meeting, error } = await client.from('meetings').insert({
      user_id: userId,
      title: payload.title,
      input_type: payload.input_type,
      raw_transcript: payload.transcript || '',
      summary: payload.summary,
      key_notes: payload.key_notes,
      action_items: payload.action_items,
      participants: payload.participants || [],
      tasks_created: [],
      task_count: 0,
      status: 'ready',
      source_type: payload.input_type,
    }).select().single();
    if (error || !meeting) { res.status(400).json({ data: null, error: error?.message || 'Failed to save meeting', status: 400 }); return; }
    await supabaseAdmin.from('notifications').insert({ user_id: userId, message: `Meeting "${payload.title}" was saved with ${payload.action_items.length} action item${payload.action_items.length === 1 ? '' : 's'}.`, type: 'meeting_processed', reference_id: meeting.id, is_read: false });
    res.status(201).json({ data: { meeting }, error: null, status: 201 });
  } catch (err) {
    console.error('POST /meetings/save-analysis error:', err);
    res.status(500).json({ data: null, error: 'Internal server error saving meeting', status: 500 });
  }
});

router.post('/', validate(createMeetingSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const payload = req.body as z.infer<typeof createMeetingSchema>;
    const client = createUserClient(req.accessToken!);
    const { data: meeting, error } = await client.from('meetings').insert({ user_id: userId, title: payload.title, raw_transcript: payload.transcript, input_type: payload.input_type, status: 'processing' }).select().single();
    if (error || !meeting) { res.status(400).json({ data: null, error: error?.message || 'Failed to create meeting', status: 400 }); return; }
    try {
      const response = await fetch(`${getMlApiUrl()}/api/ml/analyze-meeting`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`ML API returned ${response.status}`);
      const analysis = await response.json();
      const { data: updated, error: updateError } = await client.from('meetings').update({ summary: analysis.summary || '', key_notes: analysis.key_notes || [], action_items: analysis.action_items || [], participants: analysis.participants || [], status: 'ready' }).eq('id', meeting.id).select().single();
      if (updateError) throw updateError;
      res.status(201).json({ data: { meeting: updated }, error: null, status: 201 });
    } catch (mlError) {
      console.error('ML API analysis failed:', mlError);
      await client.from('meetings').update({ status: 'error' }).eq('id', meeting.id);
      res.status(502).json({ data: { meeting: { ...meeting, status: 'error' } }, error: 'Analysis failed. The meeting was saved; retry when the AI service is available.', status: 502 });
    }
  } catch (err) {
    console.error('POST /meetings error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const client = createUserClient(req.accessToken!);
    const { data, error } = await client.from('meetings').select('*').order('created_at', { ascending: false });
    if (error) { res.status(400).json({ data: null, error: error.message, status: 400 }); return; }
    res.status(200).json({ data: { meetings: data ?? [] }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /meetings error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = createUserClient(req.accessToken!);
    const { data, error } = await client.from('meetings').select('*').eq('id', req.params.id).single();
    if (error || !data) { res.status(404).json({ data: null, error: 'Meeting not found', status: 404 }); return; }
    res.status(200).json({ data: { meeting: data }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /meetings/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.post('/:id/create-tasks', validate(createTasksSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const client = createUserClient(req.accessToken!);
    const { data: meeting, error } = await client.from('meetings').select('*').eq('id', req.params.id).single();
    if (error || !meeting) { res.status(404).json({ data: null, error: 'Meeting not found', status: 404 }); return; }
    const createdTasks = await createTasksForMeeting(userId, meeting, req.body.action_item_indices, client);
    res.status(200).json({ data: { created_tasks: createdTasks }, error: null, status: 200 });
  } catch (err) {
    console.error('POST /meetings/:id/create-tasks error:', err);
    res.status(500).json({ data: null, error: 'Unable to create meeting tasks', status: 500 });
  }
});

router.post('/:id/assign-task', validate(assignTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { action_item_index, assignee_name } = req.body as z.infer<typeof assignTaskSchema>;
    const client = createUserClient(req.accessToken!);
    const { data: meeting, error } = await client.from('meetings').select('*').eq('id', req.params.id).single();
    if (error || !meeting) { res.status(404).json({ data: null, error: 'Meeting not found', status: 404 }); return; }
    const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : [];
    if (action_item_index >= actionItems.length) { res.status(400).json({ data: null, error: 'Invalid action item index', status: 400 }); return; }
    const result = await assignTaskFromMeeting(userId, meeting, action_item_index, assignee_name, client);
    const responseMessage = result.recipient_is_user
      ? `Task created and assigned to ${assignee_name}.`
      : `Task created. ${assignee_name} is not a FlowTask user.`;
    res.status(201).json({ data: { ...result, message: responseMessage }, error: null, status: 201 });
  } catch (err) {
    console.error('POST /meetings/:id/assign-task error:', err);
    res.status(500).json({ data: null, error: 'Could not assign task. Please try again.', status: 500 });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const client = createUserClient(req.accessToken!);
    const { error, count } = await client.from('meetings').delete({ count: 'exact' }).eq('id', req.params.id);
    if (error) { res.status(400).json({ data: null, error: error.message, status: 400 }); return; }
    if (count === 0) { res.status(404).json({ data: null, error: 'Meeting not found', status: 404 }); return; }
    res.status(200).json({ data: { message: 'Meeting deleted successfully' }, error: null, status: 200 });
  } catch (err) {
    console.error('DELETE /meetings/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

export default router;
