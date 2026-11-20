-- Fix the recurrence CHECK constraint to include 'weekdays'.
-- The original migration.sql had:
--   CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly'))
-- This rejects 'weekdays' which is supported by the mobile app, backend, and recurring task manager.
--
-- This migration is idempotent:
--   1. Drops ANY existing CHECK constraint on the recurrence column (regardless of name)
--   2. Adds the updated constraint with 'weekdays' included

-- Step 1: Drop all existing CHECK constraints on the recurrence column
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

-- Step 2: Add the updated constraint with 'weekdays' included
-- Use IF NOT EXISTS pattern for safety
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
