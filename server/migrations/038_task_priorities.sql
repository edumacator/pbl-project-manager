-- Migration 038: Update task priorities to P1/P2/P3
-- Data migration: high -> P1, medium -> P2, low -> P3
-- 1. Update existing values
UPDATE tasks
SET priority = 'P1'
WHERE priority = 'high';
UPDATE tasks
SET priority = 'P2'
WHERE priority = 'medium'
    OR priority IS NULL;
UPDATE tasks
SET priority = 'P3'
WHERE priority = 'low';
-- 2. Modify the column to the new ENUM and set default
-- Note: In MySQL, if we modify an ENUM to a new one that contains all existing values (which we've normalized above), it should be smooth.
ALTER TABLE tasks
MODIFY COLUMN priority ENUM('P1', 'P2', 'P3') DEFAULT 'P3';