-- Migration 010: Ensure ALL required columns exist across all tables.
-- This is idempotent and safe to run multiple times.
-- It fixes the "Could not find the 'assignee' column" error
-- and ensures meetings.participants exists.

-- ============================================================
-- TASKS TABLE — ensure all columns
-- ============================================================

-- assignee column (TEXT, already in base migration.sql but may be missing if migration was partial)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'assignee'
  ) THEN
    ALTER TABLE tasks ADD COLUMN assignee TEXT;
  END IF;
END $$;

-- parent_task_id (migration 004)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
  END IF;
END $$;

-- recurrence_end_date (migration 006)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_end_date'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_end_date TIMESTAMPTZ;
  END IF;
END $$;

-- reminder_minutes (migration 007)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'reminder_minutes'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reminder_minutes INTEGER;
  END IF;
END $$;

-- meeting_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'meeting_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- MEETINGS TABLE — ensure participants and other columns
-- ============================================================

-- participants column (JSONB array of participant names)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'participants'
  ) THEN
    ALTER TABLE meetings ADD COLUMN participants JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- source_file_name
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'source_file_name'
  ) THEN
    ALTER TABLE meetings ADD COLUMN source_file_name TEXT;
  END IF;
END $$;

-- task_count
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'task_count'
  ) THEN
    ALTER TABLE meetings ADD COLUMN task_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- source_type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE meetings ADD COLUMN source_type TEXT DEFAULT 'transcript';
  END IF;
END $$;

-- updated_at for meetings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE meetings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================
-- RECURRENCE CHECK CONSTRAINT — ensure 'weekdays' is allowed
-- ============================================================

-- Drop ALL existing CHECK constraints on the recurrence column
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'tasks'::regclass
      AND c.contype = 'c'
      AND a.attname = 'recurrence'
  LOOP
    EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

-- Add the updated constraint with 'weekdays' included
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'tasks'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%weekdays%'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_recurrence_check
      CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'weekdays'));
  END IF;
END $$;

-- ============================================================
-- TASK_ASSIGNMENTS TABLE
-- ============================================================

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_recipient_user ON task_assignments(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_recipient_email ON task_assignments(recipient_email);
CREATE INDEX IF NOT EXISTS idx_task_assignments_sender ON task_assignments(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);

-- Unique constraint (only one active assignment per task+email)
DROP INDEX IF EXISTS idx_task_assignments_unique_active;
CREATE UNIQUE INDEX idx_task_assignments_unique_active
  ON task_assignments(task_id, recipient_email)
  WHERE status NOT IN ('cancelled');

-- RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- INDEXES for tasks columns that may need them
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence) WHERE recurrence != 'none';
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_not_null ON tasks(due_date) WHERE due_date IS NOT NULL;
