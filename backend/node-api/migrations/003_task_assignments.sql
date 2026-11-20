-- Task Assignments table
-- Tracks when a user assigns/sends a task to another user by email.

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

-- Index for looking up assignments by recipient
CREATE INDEX IF NOT EXISTS idx_task_assignments_recipient_user ON task_assignments(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_recipient_email ON task_assignments(recipient_email);
CREATE INDEX IF NOT EXISTS idx_task_assignments_sender ON task_assignments(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);

-- Unique constraint: prevent duplicate active assignments for same task + recipient
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_unique_active
  ON task_assignments(task_id, recipient_email)
  WHERE status NOT IN ('cancelled');

-- RLS policies
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Sender can see their sent assignments
CREATE POLICY "Sender can view own assignments"
  ON task_assignments FOR SELECT
  USING (auth.uid() = sender_user_id);

-- Recipient can see assignments sent to them
CREATE POLICY "Recipient can view own assignments"
  ON task_assignments FOR SELECT
  USING (auth.uid() = recipient_user_id);

-- Sender can create assignments for their own tasks
CREATE POLICY "Sender can create assignments"
  ON task_assignments FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

-- Sender can update their own assignments (cancel)
CREATE POLICY "Sender can update own assignments"
  ON task_assignments FOR UPDATE
  USING (auth.uid() = sender_user_id);

-- Recipient can update assignments sent to them (accept)
CREATE POLICY "Recipient can update received assignments"
  ON task_assignments FOR UPDATE
  USING (auth.uid() = recipient_user_id);
