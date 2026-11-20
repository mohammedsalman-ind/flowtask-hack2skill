-- Add reminder_minutes column to tasks table
-- reminder_minutes = 0 means "at due time"
-- reminder_minutes = 5 means "5 minutes before due"
-- reminder_minutes = 1440 means "1 day before due"
-- NULL means no reminder
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_minutes integer;

-- Set sensible defaults for existing tasks (no reminder = NULL)
-- Existing tasks without reminders will remain NULL
