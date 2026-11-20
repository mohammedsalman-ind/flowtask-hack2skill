import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { notifyAssignment, retryAssignmentEmail } from '../services/assignmentNotificationService.js';

const router = Router();
router.use(authMiddleware);

const createAssignmentSchema = z.object({
  task_id: z.string().uuid('Invalid task ID'),
  recipient_email: z.string().trim().email('Please enter a valid email address').max(255),
  message: z.string().max(500).optional(),
});

const updateAssignmentSchema = z.object({
  status: z.enum(['accepted', 'completed', 'cancelled']),
});

/**
 * POST /api/assignments — Create a task assignment
 * Sender must own the task. Prevents duplicate active assignments.
 */
router.post('/', validate(createAssignmentSchema), async (req: Request, res: Response) => {
  try {
    const senderUserId = req.user!.id;
    const { task_id, recipient_email, message } = req.body as z.infer<typeof createAssignmentSchema>;

    // 1. Verify the sender owns the task
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .eq('user_id', senderUserId)
      .is('organization_id', null)
      .single();

    if (taskError || !task) {
      res.status(404).json({ data: null, error: 'Task not found or you do not own it.', status: 404 });
      return;
    }

    // 2. Cannot assign to yourself
    const normalizedEmail = recipient_email.toLowerCase();
    const { data: senderProfile } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', senderUserId)
      .single();

    if (senderProfile?.email?.toLowerCase() === normalizedEmail) {
      res.status(400).json({ data: null, error: 'You cannot assign a task to yourself.', status: 400 });
      return;
    }

    // 3. Check for existing active assignment (duplicate prevention)
    const { data: existing } = await supabaseAdmin
      .from('task_assignments')
      .select('id, status')
      .eq('task_id', task_id)
      .eq('recipient_email', normalizedEmail)
      .not('status', 'eq', 'cancelled')
      .limit(1);

    if (existing && existing.length > 0) {
      res.status(409).json({
        data: null,
        error: `This task is already assigned to ${normalizedEmail} (${existing[0].status}).`,
        status: 409,
      });
      return;
    }

    // 4. Look up if recipient is an existing FlowTask user
    const { data: recipientUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1);

    const recipientUserId = recipientUsers?.[0]?.id || null;

    // 5. Create the assignment
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('task_assignments')
      .insert({
        task_id,
        sender_user_id: senderUserId,
        recipient_user_id: recipientUserId,
        recipient_email: normalizedEmail,
        status: 'sent',
        message: message || null,
      })
      .select()
      .single();

    if (assignError) {
      console.error('Assignment creation error:', assignError);
      res.status(400).json({ data: null, error: 'Could not create assignment. Please try again.', status: 400 });
      return;
    }

    // 6. Trigger unified notification event (in-app + email)
    const senderName = senderProfile?.name || senderProfile?.email?.split('@')[0] || 'Someone';
    const senderEmail = senderProfile?.email || '';

    const notifResult = await notifyAssignment({
      assignmentId: assignment.id,
      taskId: task.id,
      taskTitle: task.title,
      taskDueDate: task.due_date || null,
      senderUserId,
      senderName,
      senderEmail,
      recipientUserId,
      recipientEmail: normalizedEmail,
    });

    // 7. Return the assignment with task info and notification status
    const emailFailed = !notifResult.emailResult.success && notifResult.emailResult.provider !== 'none (logged)';
    const responseMessage = emailFailed
      ? 'Task assigned. Email delivery failed, but the recipient can see it in FlowTask.'
      : 'Task assigned successfully.';

    res.status(201).json({
      data: {
        assignment,
        task,
        recipient_is_user: notifResult.recipientIsExistingUser,
        notification: {
          in_app: notifResult.inAppNotification,
          email_sent: notifResult.emailResult.success,
          email_provider: notifResult.emailResult.provider,
        },
        message: responseMessage,
      },
      error: null,
      status: 201,
    });
  } catch (err) {
    console.error('POST /assignments error:', err);
    res.status(500).json({ data: null, error: 'Could not send the task. Please try again.', status: 500 });
  }
});

/**
 * GET /api/assignments — List assignments sent by the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from('task_assignments')
      .select('*, tasks!inner(id, title, description, due_date, priority, status)')
      .eq('sender_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    res.status(200).json({ data: { assignments: data ?? [] }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /assignments error:', err);
    res.status(500).json({ data: null, error: 'Could not load assignments.', status: 500 });
  }
});

/**
 * GET /api/assignments/received — List assignments sent TO the current user
 */
router.get('/received', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    const userEmail = userProfile?.email?.toLowerCase() || '';

    const { data, error } = await supabaseAdmin
      .from('task_assignments')
      .select('*, tasks!inner(id, title, description, due_date, priority, status, user_id)')
      .or(`recipient_user_id.eq.${userId},recipient_email.eq.${userEmail}`)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }

    // Enrich with sender info
    const enriched = await Promise.all(
      (data || []).map(async (assignment: any) => {
        const { data: sender } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('id', assignment.sender_user_id)
          .single();
        return { ...assignment, sender };
      })
    );

    res.status(200).json({ data: { assignments: enriched }, error: null, status: 200 });
  } catch (err) {
    console.error('GET /assignments/received error:', err);
    res.status(500).json({ data: null, error: 'Could not load received assignments.', status: 500 });
  }
});

/**
 * POST /api/assignments/:id/accept — Accept a received assignment
 */
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const assignmentId = req.params.id;

    // Verify the current user is the recipient
    const { data: assignment, error: findError } = await supabaseAdmin
      .from('task_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('recipient_user_id', userId)
      .single();

    if (findError || !assignment) {
      res.status(404).json({ data: null, error: 'Assignment not found.', status: 404 });
      return;
    }

    if (assignment.status !== 'sent') {
      res.status(400).json({ data: null, error: `Assignment is already ${assignment.status}.`, status: 400 });
      return;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('task_assignments')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) {
      res.status(400).json({ data: null, error: 'Could not accept assignment.', status: 400 });
      return;
    }

    res.status(200).json({ data: { assignment: updated }, error: null, status: 200 });
  } catch (err) {
    console.error('POST /assignments/:id/accept error:', err);
    res.status(500).json({ data: null, error: 'Could not accept assignment.', status: 500 });
  }
});

/**
 * POST /api/assignments/:id/cancel — Cancel a sent assignment
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const assignmentId = req.params.id;

    // Verify the current user is the sender
    const { data: assignment, error: findError } = await supabaseAdmin
      .from('task_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('sender_user_id', userId)
      .single();

    if (findError || !assignment) {
      res.status(404).json({ data: null, error: 'Assignment not found.', status: 404 });
      return;
    }

    if (assignment.status === 'completed') {
      res.status(400).json({ data: null, error: 'Cannot cancel a completed assignment.', status: 400 });
      return;
    }

    if (assignment.status === 'cancelled') {
      res.status(400).json({ data: null, error: 'Assignment is already cancelled.', status: 400 });
      return;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('task_assignments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) {
      res.status(400).json({ data: null, error: 'Could not cancel assignment.', status: 400 });
      return;
    }

    res.status(200).json({ data: { assignment: updated }, error: null, status: 200 });
  } catch (err) {
    console.error('POST /assignments/:id/cancel error:', err);
    res.status(500).json({ data: null, error: 'Could not cancel assignment.', status: 500 });
  }
});

/**
 * POST /api/assignments/:id/retry-email — Retry a failed email
 */
router.post('/:id/retry-email', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const assignmentId = String(req.params.id);

    // Verify the current user is the sender
    const { data: assignment, error: findError } = await supabaseAdmin
      .from('task_assignments')
      .select('id, sender_user_id, email_status')
      .eq('id', assignmentId)
      .eq('sender_user_id', userId)
      .single();

    if (findError || !assignment) {
      res.status(404).json({ data: null, error: 'Assignment not found.', status: 404 });
      return;
    }

    if (assignment.email_status !== 'failed') {
      res.status(400).json({ data: null, error: 'Email was not marked as failed.', status: 400 });
      return;
    }

    const emailResult = await retryAssignmentEmail(assignmentId);

    res.status(200).json({
      data: {
        email_sent: emailResult.success,
        email_provider: emailResult.provider,
        error: emailResult.success ? null : emailResult.error,
      },
      error: null,
      status: 200,
    });
  } catch (err) {
    console.error('POST /assignments/:id/retry-email error:', err);
    res.status(500).json({ data: null, error: 'Could not retry email.', status: 500 });
  }
});

export default router;
