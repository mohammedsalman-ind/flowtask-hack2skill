-- Add recurrence_end_date column to tasks table
-- This stores when a recurring task should stop generating new occurrences.
-- NULL means the task recurs forever.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_end_date'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_end_date timestamptz;
  END IF;
END $$;
