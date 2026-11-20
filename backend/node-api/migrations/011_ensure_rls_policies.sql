-- ============================================================
-- Migration 011 (revised): Ensure RLS policies are correct
-- ============================================================
-- SAFETY GUARANTEES:
--   - No DELETE, TRUNCATE, or DROP TABLE statements
--   - No application data is modified or removed
--   - ADD COLUMN IF NOT EXISTS only (additive, never removes)
--   - DROP POLICY IF EXISTS only removes access RULES, not data
--   - CREATE POLICY creates access RULES, not data
--   - Idempotent: safe to run multiple times
--   - No broad EXCEPTION WHEN OTHERS THEN NULL blocks
-- ============================================================

-- ============================================================
-- 1. TASKS TABLE — add missing columns if needed
-- ============================================================
-- These ADD COLUMN IF NOT EXISTS statements are completely safe.
-- If the column already exists, they are no-ops.
-- If the column doesn't exist, it is added as nullable (no default),
-- so existing rows are unaffected.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id UUID
  REFERENCES public.tasks(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS meeting_id UUID
  REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Enable RLS (idempotent — already enabled is a no-op)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Replace task policies with correct ownership model.
-- DROP POLICY only removes the named access rule — zero rows affected.
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;

CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 2. MEETINGS TABLE
-- ============================================================
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meetings_select_own" ON public.meetings;
DROP POLICY IF EXISTS "meetings_insert_own" ON public.meetings;
DROP POLICY IF EXISTS "meetings_update_own" ON public.meetings;
DROP POLICY IF EXISTS "meetings_delete_own" ON public.meetings;

CREATE POLICY "meetings_select_own" ON public.meetings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meetings_insert_own" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meetings_update_own" ON public.meetings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "meetings_delete_own" ON public.meetings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. USERS TABLE
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 4. NOTIFICATIONS TABLE
-- ============================================================
-- SECURITY MODEL:
--   All notification inserts are performed by the Node API using
--   supabaseAdmin (service_role key), which bypasses RLS entirely.
--   The mobile client (anon key + user JWT) must NOT be able to
--   insert notifications for other users.
--
--   Therefore the INSERT policy restricts to auth.uid() = user_id.
--   The service_role client bypasses RLS, so server-side inserts
--   for other users still work.
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_server" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Mobile client can only insert notifications for themselves.
-- Server (service_role) bypasses RLS entirely, so it can still
-- insert notifications for any user.
CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. TASK_ASSIGNMENTS TABLE
-- ============================================================
-- SECURITY MODEL:
--   All task_assignment inserts/updates are performed by the Node
--   API using supabaseAdmin (service_role key), which bypasses RLS.
--
--   SELECT: users can see assignments they sent or received.
--   INSERT: restricted to auth.uid() = sender_user_id so mobile
--           clients cannot forge assignments for other users.
--           Server (service_role) bypasses RLS.
--   UPDATE: sender or recipient can update (accept/cancel).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'accepted', 'completed', 'cancelled')),
  message TEXT,
  accepted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  email_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_assignments_select_own" ON public.task_assignments;
DROP POLICY IF EXISTS "task_assignments_insert_sender" ON public.task_assignments;
DROP POLICY IF EXISTS "task_assignments_insert_server" ON public.task_assignments;
DROP POLICY IF EXISTS "task_assignments_update_own" ON public.task_assignments;

-- Users can see assignments they sent or received.
CREATE POLICY "task_assignments_select_own" ON public.task_assignments
  FOR SELECT USING (
    auth.uid() = sender_user_id
    OR auth.uid() = recipient_user_id
  );

-- Mobile client can only create assignments where they are the sender.
-- Server (service_role) bypasses RLS entirely.
CREATE POLICY "task_assignments_insert_sender" ON public.task_assignments
  FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

-- Sender or recipient can update (accept/cancel).
CREATE POLICY "task_assignments_update_own" ON public.task_assignments
  FOR UPDATE USING (
    auth.uid() = sender_user_id
    OR auth.uid() = recipient_user_id
  );
