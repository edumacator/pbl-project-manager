-- Migration 031: Consolidate due_date and end_date on tasks
-- First, ensure any task with an end_date but no due_date preserves its end date
UPDATE tasks
SET due_date = end_date
WHERE due_date IS NULL
    AND end_date IS NOT NULL;
-- Now drop the end_date column as it is redundant
ALTER TABLE tasks DROP COLUMN end_date;