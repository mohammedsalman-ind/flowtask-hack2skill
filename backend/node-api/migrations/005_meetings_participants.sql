-- Add participants column to meetings table to store detected speaker names
-- This is safe to run multiple times (idempotent)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'participants'
  ) THEN
    ALTER TABLE meetings ADD COLUMN participants jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
