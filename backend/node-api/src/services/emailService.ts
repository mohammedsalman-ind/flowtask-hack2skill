/**
 * Email service abstraction for FlowTask.
 *
 * Currently a logging stub. To enable real email delivery:
 * 1. Set EMAIL_PROVIDER=resend|sendgrid|nodemailer in .env
 * 2. Set the corresponding API key / SMTP credentials
 * 3. Set EMAIL_FROM=noreply@yourdomain.com
 *
 * The service is designed to be replaceable — swap the provider
 * implementation without changing callers.
 */

export type EmailResult = {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
};

export type AssignmentEmailParams = {
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  taskTitle: string;
  taskDueDate: string | null;
  assignmentId: string;
  isExistingUser: boolean;
};

export async function sendWorkspaceInvite(email: string, organization: string, link: string): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'none';
  const from = process.env.EMAIL_FROM || 'noreply@flowtask.app';
  const subject = 'Your FlowTask workspace invitation';
  const message = `You were invited to join ${organization} in FlowTask. Sign in with this email to respond. The invitation expires in 7 days.\n\n${link}`;
  if (provider !== 'resend' && provider !== 'sendgrid') return { success: false, provider };
  const resend = provider === 'resend';
  const key = resend ? process.env.RESEND_API_KEY : process.env.SENDGRID_API_KEY;
  if (!key) return { success: false, provider };
  try {
    const response = await fetch(resend ? 'https://api.resend.com/emails' : 'https://api.sendgrid.com/v3/mail/send', {
      method: 'POST', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(resend
        ? { from, to: email, subject, text: message }
        : { from: { email: from }, personalizations: [{ to: [{ email }] }], subject, content: [{ type: 'text/plain', value: message }] }),
    });
    return { success: response.ok, provider };
  } catch {
    return { success: false, provider };
  }
}

/**
 * Send an assignment notification email.
 * Falls back gracefully if no email provider is configured.
 */
export async function sendAssignmentEmail(params: AssignmentEmailParams): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'none';

  if (provider === 'none' || !provider) {
    console.log(`[Email] No provider configured. Set EMAIL_PROVIDER=resend|sendgrid and the corresponding API key in your .env file.`);
    console.log(`[Email] Assignment email NOT sent — provider not configured.`);
    console.log(`[Email] Would have sent to: ${params.recipientEmail}`);
    console.log(`[Email] Task: "${params.taskTitle}" from ${params.senderName}`);
    console.log(`[Email] Required env vars: EMAIL_PROVIDER, RESEND_API_KEY or SENDGRID_API_KEY, EMAIL_FROM`);
    return { success: false, provider: 'none (not configured)', error: 'Email provider not configured. Set EMAIL_PROVIDER in .env to enable email delivery.' };
  }

  try {
    if (provider === 'resend') {
      return await sendViaResend(params);
    }
    if (provider === 'sendgrid') {
      return await sendViaSendGrid(params);
    }
    console.warn(`[Email] Unknown provider: ${provider}`);
    return { success: false, provider, error: `Unknown email provider: ${provider}` };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown email error';
    console.error(`[Email] Failed to send to ${params.recipientEmail}:`, errorMsg);
    return { success: false, provider, error: errorMsg };
  }
}

/**
 * Send assignment invitation email to a non-FlowTask user.
 */
export async function sendInvitationEmail(params: AssignmentEmailParams): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'none';

  if (provider === 'none' || !provider) {
    console.log(`[Email] No provider configured. Invitation email NOT sent to ${params.recipientEmail}.`);
    console.log(`[Email] Required env vars: EMAIL_PROVIDER, RESEND_API_KEY or SENDGRID_API_KEY, EMAIL_FROM`);
    return { success: false, provider: 'none (not configured)', error: 'Email provider not configured. Set EMAIL_PROVIDER in .env to enable email delivery.' };
  }

  // For now, use the same send function with a different subject/body
  return sendAssignmentEmail({ ...params, isExistingUser: false });
}

// ---- Provider implementations ----

async function sendViaResend(params: AssignmentEmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@flowtask.app';

  if (!apiKey) {
    return { success: false, provider: 'resend', error: 'RESEND_API_KEY not set' };
  }

  const dueLine = params.taskDueDate
    ? `Due: ${new Date(params.taskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  const subject = params.isExistingUser
    ? `${params.senderName} assigned you a task on FlowTask`
    : `${params.senderName} invited you to a task on FlowTask`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #263238; font-size: 20px; margin-bottom: 8px;">${params.senderName} assigned you a task</h2>
      <div style="background: #F7F3EC; border-radius: 12px; padding: 20px; margin: 16px 0;">
        <p style="font-size: 16px; font-weight: 700; color: #263238; margin: 0 0 8px 0;">${params.taskTitle}</p>
        ${dueLine ? `<p style="font-size: 14px; color: #7A7773; margin: 0;">${dueLine}</p>` : ''}
      </div>
      <p style="font-size: 14px; color: #7A7773; margin: 16px 0;">
        ${params.isExistingUser
          ? 'Open FlowTask to view and work on this task.'
          : 'Create a FlowTask account to accept this task.'}
      </p>
      <a href="flowtask://auth/callback" style="display: inline-block; background: #C98664; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px;">
        Open FlowTask
      </a>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: params.recipientEmail,
      subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return { success: false, provider: 'resend', error: `Resend API error: ${response.status} ${errorBody}` };
  }

  const data = await response.json();
  return { success: true, provider: 'resend', messageId: data.id };
}

async function sendViaSendGrid(params: AssignmentEmailParams): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@flowtask.app';

  if (!apiKey) {
    return { success: false, provider: 'sendgrid', error: 'SENDGRID_API_KEY not set' };
  }

  const dueLine = params.taskDueDate
    ? `Due: ${new Date(params.taskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  const subject = params.isExistingUser
    ? `${params.senderName} assigned you a task on FlowTask`
    : `${params.senderName} invited you to a task on FlowTask`;

  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #263238; font-size: 20px;">${params.senderName} assigned you a task</h2>
      <div style="background: #F7F3EC; border-radius: 12px; padding: 20px; margin: 16px 0;">
        <p style="font-size: 16px; font-weight: 700; color: #263238; margin: 0 0 8px 0;">${params.taskTitle}</p>
        ${dueLine ? `<p style="font-size: 14px; color: #7A7773; margin: 0;">${dueLine}</p>` : ''}
      </div>
      <a href="flowtask://auth/callback" style="display: inline-block; background: #C98664; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700;">
        Open FlowTask
      </a>
    </div>
  `;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.recipientEmail }] }],
      from: { email: fromEmail },
      subject,
      content: [{ type: 'text/html', value: htmlContent }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return { success: false, provider: 'sendgrid', error: `SendGrid API error: ${response.status} ${errorBody}` };
  }

  return { success: true, provider: 'sendgrid', messageId: `sg-${Date.now()}` };
}
