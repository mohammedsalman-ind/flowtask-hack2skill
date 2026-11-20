-- Catch-up migration: ensure all columns required by the current codebase exist.
-- This is idempotent and safe to run multiple times.
-- Use this when the base migration.sql was applied but numbered migrations were missed.

-- Ensure parent_task_id column exists (migration 004)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
  END IF;
END $$;

-- Ensure recurrence_end_date column exists (migration 006)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_end_date'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_end_date timestamptz;
  END IF;
END $$;

-- Ensure reminder_minutes column exists (migration 007)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'reminder_minutes'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reminder_minutes integer;
  END IF;
END $$;

-- Ensure meeting_id column exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'meeting_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure task_assignments table exists (migration 003)
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'accepted', 'completed', 'cancelled')),
  message TEXT,
  email_status TEXT DEFAULT 'none' CHECK (email_status IN ('none', 'sent', 'failed')),
  email_error TEXT,
  email_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Ensure task_assignments indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_recipient_user ON task_assignments(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_recipient_email ON task_assignments(recipient_email);
CREATE INDEX IF NOT EXISTS idx_task_assignments_sender ON task_assignments(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);

-- Ensure task_assignments unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_unique_active
  ON task_assignments(task_id, recipient_email)
  WHERE status NOT IN ('cancelled');

-- Ensure task_assignments RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Use DO blocks to avoid errors if policies already exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sender can view own assignments' AND tablename = 'task_assignments') THEN
    CREATE POLICY "Sender can view own assignments"
      ON task_assignments FOR SELECT
      USING (auth.uid() = sender_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Recipient can view own assignments' AND tablename = 'task_assignments') THEN
    CREATE POLICY "Recipient can view own assignments"
      ON task_assignments FOR SELECT
      USING (auth.uid() = recipient_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sender can create assignments' AND tablename = 'task_assignments') THEN
    CREATE POLICY "Sender can create assignments"
      ON task_assignments FOR INSERT
      WITH CHECK (auth.uid() = sender_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sender can update own assignments' AND tablename = 'task_assignments') THEN
    CREATE POLICY "Sender can update own assignments"
      ON task_assignments FOR UPDATE
      USING (auth.uid() = sender_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Recipient can update received assignments' AND tablename = 'task_assignments') THEN
    CREATE POLICY "Recipient can update received assignments"
      ON task_assignments FOR UPDATE
      USING (auth.uid() = recipient_user_id);
  END IF;
END $$;
