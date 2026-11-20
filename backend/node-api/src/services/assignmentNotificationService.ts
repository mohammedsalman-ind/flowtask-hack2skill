import { supabaseAdmin } from '../db/supabase.js';
import { sendAssignmentEmail, sendInvitationEmail, type EmailResult } from './emailService.js';
import { sendAssignmentPushNotification } from './pushNotificationService.js';

export type AssignmentNotificationResult = {
  assignmentId: string;
  inAppNotification: boolean;
  emailResult: EmailResult;
  recipientIsExistingUser: boolean;
};

type NotifyAssignmentParams = {
  assignmentId: string;
  taskId: string;
  taskTitle: string;
  taskDueDate: string | null;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  recipientUserId: string | null;
  recipientEmail: string;
};

/**
 * Unified assignment notification event.
 *
 * After a TaskAssignment is successfully created, call this function
 * to trigger all applicable notification channels:
 *   1. In-app notification (if recipient is an existing FlowTask user)
 *   2. Email notification (always — assignment or invitation)
 *   3. Phone notification is handled client-side via the notifications table poll
 *
 * The assignment is considered successful even if email fails.
 * Email failures are logged but do not block the assignment.
 */
export async function notifyAssignment(params: NotifyAssignmentParams): Promise<AssignmentNotificationResult> {
  const {
    assignmentId,
    taskId,
    taskTitle,
    taskDueDate,
    senderUserId,
    senderName,
    senderEmail,
    recipientUserId,
    recipientEmail,
  } = params;

  const recipientIsExistingUser = !!recipientUserId;

  // ── 1. In-app notification ──────────────────────────────────────────
  let inAppNotification = false;

  if (recipientUserId) {
    const dueLabel = taskDueDate
      ? ` Due: ${new Date(taskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
      : '';

    const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
      user_id: recipientUserId,
      message: `${senderName} assigned you the task "${taskTitle}".${dueLabel}`,
      type: 'task_assigned',
      reference_id: taskId,
      is_read: false,
    });

    if (notifErr) {
      console.error('[AssignNotify] In-app notification failed:', notifErr.message);
    } else {
      inAppNotification = true;
    }
  }

  // ── 2. Email notification ───────────────────────────────────────────
  let emailResult: EmailResult;

  const emailParams = {
    recipientEmail,
    senderName,
    senderEmail,
    taskTitle,
    taskDueDate,
    assignmentId,
    isExistingUser: recipientIsExistingUser,
  };

  try {
    if (recipientIsExistingUser) {
      emailResult = await sendAssignmentEmail(emailParams);
    } else {
      emailResult = await sendInvitationEmail(emailParams);
    }
  } catch (err) {
    console.error('[AssignNotify] Email send crashed:', err);
    emailResult = {
      success: false,
      provider: 'unknown',
      error: err instanceof Error ? err.message : 'Email send crashed',
    };
  }

  // ── 3. Track email status on the assignment ─────────────────────────
  const emailStatus = emailResult.success ? 'sent' : 'failed';
  await supabaseAdmin
    .from('task_assignments')
    .update({
      email_status: emailStatus,
      email_error: emailResult.success ? null : emailResult.error || 'Unknown error',
      email_provider: emailResult.provider,
    })
    .eq('id', assignmentId);

  // ── 4. Remote push notification to recipient ────────────────────────
  // This is a REAL push notification to the assignee's device(s),
  // not just a local notification on the sender's device.
  if (recipientUserId) {
    try {
      await sendAssignmentPushNotification({
        recipientUserId,
        senderName,
        taskTitle,
        taskDueDate,
        taskId,
      });
    } catch (err) {
      // Push failure is non-blocking — assignment + email are already done
      console.warn('[AssignNotify] Push notification failed:', err);
    }
  }

  return {
    assignmentId,
    inAppNotification,
    emailResult,
    recipientIsExistingUser,
  };
}

/**
 * Retry a failed email for an existing assignment.
 */
export async function retryAssignmentEmail(assignmentId: string): Promise<EmailResult> {
  // 1. Fetch the assignment with task + sender info
  const { data: assignment, error: fetchErr } = await supabaseAdmin
    .from('task_assignments')
    .select(`
      *,
      tasks!inner(id, title, due_date, user_id)
    `)
    .eq('id', assignmentId)
    .single();

  if (fetchErr || !assignment) {
    return { success: false, provider: 'none', error: 'Assignment not found.' };
  }

  // 2. Fetch sender profile
  const { data: senderProfile } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('id', assignment.sender_user_id)
    .single();

  const senderName = senderProfile?.name || senderProfile?.email?.split('@')[0] || 'Someone';
  const senderEmail = senderProfile?.email || '';

  // 3. Check if recipient is now a user
  const { data: recipientUsers } = await supabaseAdmin
    .from('users')
    .select('id')
    .ilike('email', assignment.recipient_email)
    .limit(1);

  const recipientUserId = recipientUsers?.[0]?.id || null;
  const isExistingUser = !!recipientUserId;

  // 4. Retry email
  const emailParams = {
    recipientEmail: assignment.recipient_email,
    senderName,
    senderEmail,
    taskTitle: assignment.tasks.title,
    taskDueDate: assignment.tasks.due_date,
    assignmentId,
    isExistingUser,
  };

  const emailResult = isExistingUser
    ? await sendAssignmentEmail(emailParams)
    : await sendInvitationEmail(emailParams);

  // 5. Update tracking
  await supabaseAdmin
    .from('task_assignments')
    .update({
      email_status: emailResult.success ? 'sent' : 'failed',
      email_error: emailResult.success ? null : emailResult.error || 'Unknown error',
      email_provider: emailResult.provider,
    })
    .eq('id', assignmentId);

  return emailResult;
}
