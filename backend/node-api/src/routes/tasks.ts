import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, createUserClient } from '../db/supabase.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { sendAssignmentPushNotification } from '../services/pushNotificationService.js';

const router = Router();
router.use(authMiddleware);

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(5000).optional().default(''),
  status: z.enum(['todo', 'in_progress', 'done']).optional().default('todo'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  tags: z.array(z.string()).optional().default([]),
  due_date: z.string().datetime({ offset: true }).nullable().optional(),
  reminder_minutes: z.number().int().min(0).max(10080).nullable().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'weekdays']).optional().default('none'),
  recurrence_end_date: z.string().datetime({ offset: true }).nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  context: z.enum(['work', 'personal', 'health', 'study']).optional().default('personal'),
  assignee: z.string().trim().max(160).nullable().optional(),
});

const updateTaskSchema = createTaskSchema.partial();
const patchStatusSchema = z.object({ status: z.enum(['todo', 'in_progress', 'done']) });

async function notifyAssignee(task: any, currentUserId: string) {
  const assignee = typeof task.assignee === 'string' ? task.assignee.trim() : '';
  if (!assignee || assignee.toLowerCase() === 'self' || assignee.toLowerCase() === 'unassigned') return;

  let query = supabaseAdmin.from('users').select('id,email,name').limit(1);
  if (assignee.includes('@')) query = query.ilike('email', assignee);
  else query = query.ilike('name', assignee);
  const { data: users } = await query;
  const recipient = users?.[0];
  if (!recipient || recipient.id === currentUserId) return;

  // In-app notification
  await supabaseAdmin.from('notifications').insert({
    user_id: recipient.id,
    message: `You were assigned the task "${task.title}".`,
    type: 'task_assigned',
    reference_id: task.id,
    is_read: false,
  });

  // Remote push notification to assignee's device(s)
  const senderProfile = (await supabaseAdmin.from('users').select('name').eq('id', currentUserId).single()).data;
  sendAssignmentPushNotification({
    recipientUserId: recipient.id,
    senderName: senderProfile?.name || 'Someone',
    taskTitle: task.title,
    taskDueDate: task.due_date || null,
    taskId: task.id,
  }).catch((err) => console.warn('[Tasks] Push notification failed:', err));
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const client = createUserClient(req.accessToken!);
    const userId = req.user!.id;
    const { status, priority, context, goal_id, search, sort_by = 'created_at', sort_order = 'desc', limit = '100', offset = '0' } = req.query as Record<string, string>;
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);
    const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
    let query = client.from('tasks').select('*', { count: 'exact' }).eq('user_id', userId);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (context) query = query.eq('context', context);
    if (goal_id) query = query.eq('goal_id', goal_id);
    if (search?.trim()) {
      const term = search.trim().replace(/[,%]/g, ' ');
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    const validSortColumns = ['due_date', 'created_at', 'updated_at', 'title', 'priority'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    query = query.order(sortColumn, { ascending: sort_order === 'asc', nullsFirst: false }).range(safeOffset, safeOffset + safeLimit - 1);
    const { data, error, count } = await query;
    if (error) {
      console.error('[Tasks] GET query error:', error.message);
      res.status(400).json({ data: null, error: error.message, status: 400 }); return;
    }
    res.status(200).json({ data: { tasks: data ?? [], total: count ?? data?.length ?? 0 }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /tasks error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = createUserClient(req.accessToken!);
    const { data, error } = await client.from('tasks').select('*').eq('id', req.params.id).eq('user_id', req.user!.id).single();
    if (error || !data) { res.status(404).json({ data: null, error: 'Task not found', status: 404 }); return; }
    res.status(200).json({ data: { task: data }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /tasks/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.post('/', validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const payload = req.body as z.infer<typeof createTaskSchema>;
    const client = createUserClient(req.accessToken!);
    const { data, error } = await client.from('tasks').insert({ ...payload, user_id: userId }).select().single();
    if (error) {
      console.error('[Tasks] INSERT error:', error.message, error);
      res.status(400).json({ data: null, error: error.message, status: 400 }); return;
    }
    await notifyAssignee(data, userId).catch((err) => console.warn('Assignee notification failed:', err));
    res.status(201).json({ data: { task: data }, error: null, status: 201 });
  } catch (err) {
    console.error('POST /tasks error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.put('/:id', validate(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const client = createUserClient(req.accessToken!);
    const { data: existing } = await client.from('tasks').select('*').eq('id', req.params.id).eq('user_id', userId).single();
    if (!existing) { res.status(404).json({ data: null, error: 'Task not found', status: 404 }); return; }
    if (existing.organization_id) { res.status(403).json({ data: null, error: 'Edit this task in its organization workspace.', status: 403 }); return; }
    const payload = req.body as z.infer<typeof updateTaskSchema>;
    const { data, error } = await client.from('tasks').update(payload).eq('id', req.params.id).eq('user_id', userId).is('organization_id', null).select().single();
    if (error) {
      console.error('[Tasks] UPDATE error:', error.message);
      res.status(400).json({ data: null, error: error.message, status: 400 }); return;
    }
    if (payload.assignee && payload.assignee !== existing.assignee) await notifyAssignee(data, userId).catch((err) => console.warn('Assignee notification failed:', err));
    res.status(200).json({ data: { task: data }, error: null, status: 200 });
  } catch (err) {
    console.error('PUT /tasks/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.patch('/:id/status', validate(patchStatusSchema), async (req: Request, res: Response) => {
  try {
    const client = createUserClient(req.accessToken!);
    const { data: task } = await client.from('tasks').select('organization_id').eq('id', req.params.id).eq('user_id', req.user!.id).single();
    if (!task) { res.status(404).json({ data: null, error: 'Task not found', status: 404 }); return; }
    const { data, error } = task.organization_id
      ? await client.rpc('workspace_update_task', { workspace: task.organization_id, task: req.params.id, changes: { stage: req.body.status } })
      : await client.from('tasks').update({ status: req.body.status }).eq('id', req.params.id).eq('user_id', req.user!.id).is('organization_id', null).select().single();
    const updated = Array.isArray(data) ? data[0] : data;
    if (error || !updated) { res.status(404).json({ data: null, error: 'Task not found', status: 404 }); return; }
    res.status(200).json({ data: { task: updated }, error: null, status: 200 });
  } catch (err) {
    console.error('PATCH /tasks/:id/status error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const client = createUserClient(req.accessToken!);
    const { error, count } = await client.from('tasks').delete({ count: 'exact' }).eq('id', req.params.id)
      .eq('user_id', req.user!.id).is('organization_id', null);
    if (error) {
      console.error('[Tasks] DELETE error:', error.message);
      res.status(400).json({ data: null, error: error.message, status: 400 }); return;
    }
    if (count === 0) { res.status(404).json({ data: null, error: 'Task not found', status: 404 }); return; }
    res.status(200).json({ data: { message: 'Task deleted successfully' }, error: null, status: 200 });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

export default router;
