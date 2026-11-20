import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase.js';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const authEmailRedirectTo = process.env.AUTH_EMAIL_REDIRECT_TO || `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/login`;
const autoConfirmEmail = process.env.AUTH_AUTO_CONFIRM_EMAIL !== 'false' && process.env.NODE_ENV !== 'production';

const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name too long'),
});
const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
const googleAuthSchema = z.object({ access_token: z.string().min(1, 'Access token is required') });

async function ensureProfile(user: any) {
  if (!user?.id) return null;
  const { data: existing } = await supabaseAdmin.from('users').select('*').eq('id', user.id).maybeSingle();
  if (existing) return existing;
  const { data: created } = await supabaseAdmin.from('users').upsert({
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.user_metadata?.full_name || '',
    avatar_url: user.user_metadata?.avatar_url || null,
  }, { onConflict: 'id' }).select('*').single();
  return created;
}

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as z.infer<typeof registerSchema>;
    let user: any = null;
    let session: any = null;

    if (autoConfirmEmail) {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (result.error || !result.data.user) {
        const errorMsg = result.error?.message || 'Unable to create account.';
        const isUpstreamFailure = errorMsg.includes('fetch failed') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED');
        res.status(isUpstreamFailure ? 503 : 400).json({
          data: null,
          error: isUpstreamFailure
            ? 'Authentication service is temporarily unavailable. The database or auth provider is unreachable.'
            : errorMsg,
          status: isUpstreamFailure ? 503 : 400,
        });
        return;
      }
      user = result.data.user;
      const loginResult = await supabaseAdmin.auth.signInWithPassword({ email, password });
      if (loginResult.error || !loginResult.data.session) {
        res.status(500).json({ data: null, error: 'Account created but sign-in could not be started. Please log in again.', status: 500 });
        return;
      }
      session = loginResult.data.session;
    } else {
      const result = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: authEmailRedirectTo },
      });
      if (result.error || !result.data.user) {
        const errorMsg = result.error?.message || 'Unable to create account.';
        const isUpstreamFailure = errorMsg.includes('fetch failed') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED');
        res.status(isUpstreamFailure ? 503 : 400).json({
          data: null,
          error: isUpstreamFailure
            ? 'Authentication service is temporarily unavailable. The database or auth provider is unreachable.'
            : errorMsg,
          status: isUpstreamFailure ? 503 : 400,
        });
        return;
      }
      user = result.data.user;
      session = result.data.session;
    }

    const profile = await ensureProfile(user);
    const requiresConfirmation = !session?.access_token;
    res.status(requiresConfirmation ? 202 : 201).json({
      data: {
        user: profile || user,
        access_token: session?.access_token ?? null,
        refresh_token: session?.refresh_token ?? null,
        requires_confirmation: requiresConfirmation,
      },
      error: null,
      status: requiresConfirmation ? 202 : 201,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ data: null, error: err?.message || 'Internal server error', status: 500 });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      const errorMsg = error?.message || 'Invalid email or password.';
      const isUpstreamFailure = errorMsg.includes('fetch failed') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED');
      res.status(isUpstreamFailure ? 503 : 401).json({
        data: null,
        error: isUpstreamFailure
          ? 'Authentication service is temporarily unavailable. The database or auth provider is unreachable.'
          : errorMsg,
        status: isUpstreamFailure ? 503 : 401,
      });
      return;
    }
    const profile = await ensureProfile(data.user);
    res.status(200).json({
      data: { user: profile || data.user, access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      error: null,
      status: 200,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ data: null, error: err?.message || 'Internal server error', status: 500 });
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.signOut(req.accessToken!);
    if (error) console.warn('Logout warning:', error.message);
    res.status(200).json({ data: { message: 'Logged out successfully' }, error: null, status: 200 });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(200).json({ data: { message: 'Logged out locally' }, error: null, status: 200 });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const profile = await ensureProfile(req.user);
    if (!profile) {
      res.status(404).json({ data: null, error: 'User profile not found', status: 404 });
      return;
    }
    res.status(200).json({ data: { user: profile }, error: null, status: 200 });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.post('/google', validate(googleAuthSchema), async (req: Request, res: Response) => {
  try {
    const { access_token } = req.body as z.infer<typeof googleAuthSchema>;
    const { data, error } = await supabaseAdmin.auth.getUser(access_token);
    if (error || !data.user) {
      res.status(401).json({ data: null, error: 'Invalid Google OAuth token', status: 401 });
      return;
    }
    const profile = await ensureProfile(data.user);
    res.status(200).json({ data: { user: profile || data.user, access_token }, error: null, status: 200 });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refresh_token = z.string().min(1).parse(req.body?.refresh_token);
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
    if (error || !data.session) {
      res.status(401).json({ data: null, error: error?.message || 'Invalid or expired refresh token', status: 401 });
      return;
    }
    res.status(200).json({ data: { access_token: data.session.access_token, refresh_token: data.session.refresh_token }, error: null, status: 200 });
  } catch {
    res.status(400).json({ data: null, error: 'Refresh token is required', status: 400 });
  }
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100),
  avatar_url: z.string().url().or(z.literal('')).nullable().optional(),
});

router.patch('/profile', authMiddleware, validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, avatar_url } = req.body as z.infer<typeof updateProfileSchema>;
    const { data: updatedUser, error } = await supabaseAdmin.from('users').update({ name, avatar_url }).eq('id', userId).select().single();
    if (error) {
      res.status(400).json({ data: null, error: error.message, status: 400 });
      return;
    }
    res.status(200).json({ data: { user: updatedUser }, error: null, status: 200 });
  } catch (err) {
    console.error('PATCH /profile error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

/**
 * DELETE /api/auth/me
 * Permanently delete the authenticated user's account and all associated data.
 * Requires authentication. Never accept user ID from the client.
 */
router.delete('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Delete user-owned data across all tables
    //    Errors here are logged but do not block account deletion
    const dataCleanupErrors: string[] = [];

    const cleanupTables = [
      { table: 'tasks', column: 'user_id' },
      { table: 'meetings', column: 'user_id' },
      { table: 'notifications', column: 'user_id' },
      { table: 'task_assignments', column: 'sender_user_id' },
      { table: 'task_assignments', column: 'recipient_user_id' },
      { table: 'users', column: 'id' },
    ];

    for (const { table, column } of cleanupTables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, userId);
      if (error) {
        console.error(`[DeleteAccount] Failed to delete from ${table}:`, error.message);
        dataCleanupErrors.push(`${table}: ${error.message}`);
      }
    }

    // 2. Delete the Supabase Auth user (must be last — this is the authoritative identity)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('[DeleteAccount] Auth user deletion failed:', authError.message);
      // If auth deletion fails but data was cleaned, still report success to prevent
      // the user from being stuck in a broken state. The admin can clean up orphaned auth users.
      if (dataCleanupErrors.length === 0) {
        res.status(200).json({ data: { message: 'Account deleted successfully' }, error: null, status: 200 });
        return;
      }
      res.status(500).json({
        data: null,
        error: 'Account data was deleted but the login account could not be removed. Please contact support.',
        status: 500,
      });
      return;
    }

    // 3. Sign out any remaining sessions for this user
    try {
      await supabaseAdmin.auth.admin.signOut(req.accessToken!);
    } catch {
      // Best-effort sign out — not critical
    }

    res.status(200).json({ data: { message: 'Account deleted successfully' }, error: null, status: 200 });
  } catch (err) {
    console.error('DELETE /auth/me error:', err);
    res.status(500).json({ data: null, error: 'Could not delete account. Please try again.', status: 500 });
  }
});

// ---- Push Token Registration ----

const pushTokenSchema = z.object({
  push_token: z.string().min(1, 'Push token is required').max(1000),
  platform: z.enum(['ios', 'android']).default('android'),
  device_id: z.string().max(255).optional(),
});

/**
 * POST /api/auth/push-token — Register device push token for remote notifications.
 * Stores the token in users.push_subscription JSONB column.
 * Supports multiple devices per user.
 */
router.post('/push-token', authMiddleware, validate(pushTokenSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { push_token, platform, device_id } = req.body as z.infer<typeof pushTokenSchema>;

    // Get current push subscription
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    const current = (user?.push_subscription as any) || {};
    const tokens: string[] = Array.isArray(current.tokens) ? current.tokens : [];
    const devices: Record<string, { token: string; platform: string; registered_at: string }> =
      current.devices || {};

    // Add or update token
    const deviceKey = device_id || push_token.slice(-20);
    if (!tokens.includes(push_token)) {
      tokens.push(push_token);
    }
    devices[deviceKey] = {
      token: push_token,
      platform,
      registered_at: new Date().toISOString(),
    };

    // Clean up tokens that are no longer referenced by any device
    const activeTokens = new Set(Object.values(devices).map((d) => d.token));
    const cleanedTokens = tokens.filter((t) => activeTokens.has(t));

    const subscription = {
      tokens: cleanedTokens,
      devices,
    };

    const { error } = await supabaseAdmin
      .from('users')
      .update({ push_subscription: subscription })
      .eq('id', userId);

    if (error) {
      console.error('[PushToken] Failed to store push token:', error.message);
      res.status(500).json({ data: null, error: 'Failed to register push token', status: 500 });
      return;
    }

    res.status(200).json({ data: { success: true, token_count: cleanedTokens.length }, error: null, status: 200 });
  } catch (err) {
    console.error('POST /auth/push-token error:', err);
    res.status(500).json({ data: null, error: 'Internal server error', status: 500 });
  }
});

export default router;
