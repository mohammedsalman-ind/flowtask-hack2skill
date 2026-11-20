/**
 * Push notification service for FlowTask.
 *
 * Sends remote push notifications via the Expo Push Notification API.
 * This enables cross-user notifications (e.g., task assignment).
 *
 * Architecture:
 * - Mobile app registers push token on login via POST /api/auth/push-token
 * - Backend stores tokens in users.push_subscription JSONB
 * - When User A assigns to User B, backend sends push to User B's token(s)
 *
 * Uses Expo Push HTTP API directly — no additional packages needed.
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { supabaseAdmin } from '../db/supabase.js';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string | boolean;
  channelId?: string;
  badge?: number;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string | 'default';
  channelId?: string;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo allows up to 100 messages per batch

/**
 * Send a push notification to a specific user.
 *
 * Looks up the user's stored push token(s) and sends via Expo Push API.
 * Handles multiple devices per user.
 *
 * Returns the number of successfully sent notifications.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  // Look up user's push subscription (stored as JSONB)
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('push_subscription')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.warn('[Push] User not found:', userId);
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const subscription = user.push_subscription as any;
  if (!subscription) {
    console.log('[Push] No push token for user:', userId);
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  // Support both single token and array of tokens
  const tokens: string[] = Array.isArray(subscription.tokens)
    ? subscription.tokens
    : typeof subscription.token === 'string'
      ? [subscription.token]
      : [];

  if (tokens.length === 0) {
    console.log('[Push] Empty token list for user:', userId);
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  return sendPushToTokens(tokens, payload);
}

/**
 * Send a push notification to specific tokens via Expo Push API.
 */
async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    sound: payload.sound === true ? 'default' : payload.sound === false ? undefined : (payload.sound || 'default') as string | undefined,
    channelId: payload.channelId || 'assignments',
    priority: 'high',
  }));

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  // Send in batches of 100
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.error(`[Push] Expo API error: ${response.status}`);
        failed += batch.length;
        continue;
      }

      const result = await response.json() as {
        data?: Array<{ status: string; id?: string; message?: string; error?: string }>;
      };

      if (result.data) {
        for (let j = 0; j < result.data.length; j++) {
          const ticket = result.data[j];
          const tokenIndex = i + j;

          if (ticket.status === 'ok') {
            sent++;
          } else {
            failed++;
            // Track invalid tokens for cleanup
            if (ticket.status === 'error' && ticket.error === 'DeviceNotRegistered') {
              invalidTokens.push(tokens[tokenIndex]);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Push] Network error sending batch:', err);
      failed += batch.length;
    }
  }

  // Clean up invalid tokens
  if (invalidTokens.length > 0) {
    await cleanupInvalidTokens(invalidTokens);
  }

  return { sent, failed, invalidTokens };
}

/**
 * Remove invalid/expired push tokens from the database.
 */
async function cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
  for (const token of invalidTokens) {
    try {
      // Find users with this token and remove it
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, push_subscription')
        .not('push_subscription', 'is', null);

      if (!users) continue;

      for (const user of users) {
        const sub = user.push_subscription as any;
        if (!sub) continue;

        const tokens: string[] = Array.isArray(sub.tokens) ? sub.tokens : [];
        if (tokens.includes(token)) {
          const newTokens = tokens.filter((t) => t !== token);
          const newSubscription = newTokens.length > 0
            ? { tokens: newTokens }
            : null;

          await supabaseAdmin
            .from('users')
            .update({ push_subscription: newSubscription })
            .eq('id', user.id);
        }
      }
    } catch (err) {
      console.warn('[Push] Failed to clean up invalid token:', err);
    }
  }
}

/**
 * Convenience: Send an assignment notification to the assigned user.
 */
export async function sendAssignmentPushNotification(params: {
  recipientUserId: string;
  senderName: string;
  taskTitle: string;
  taskDueDate: string | null;
  taskId: string;
}): Promise<{ sent: number }> {
  const dueLabel = params.taskDueDate
    ? ` · Due ${new Date(params.taskDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : '';

  const result = await sendPushToUser(params.recipientUserId, {
    title: `${params.senderName} assigned you a task`,
    body: `${params.taskTitle}${dueLabel}`,
    data: {
      taskId: params.taskId,
      type: 'task-assigned',
      senderName: params.senderName,
    },
    channelId: 'assignments',
  });

  return { sent: result.sent };
}
