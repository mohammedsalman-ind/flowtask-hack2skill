-- Add parent_task_id to support true recurring task occurrences.
-- The "parent" task defines the recurrence rule.
-- Each occurrence is a separate task row linked to the parent.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
