-- Migration 038: Update task priorities to P1/P2/P3 safely
-- 1. Expand ENUM to include both old and new values
ALTER TABLE tasks
MODIFY COLUMN priority ENUM('high', 'medium', 'low', 'P1', 'P2', 'P3') DEFAULT 'medium';
-- 2. Update existing values
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
-- 3. Shrink ENUM to only new values and set new default
ALTER TABLE tasks
MODIFY COLUMN priority ENUM('P1', 'P2', 'P3') DEFAULT 'P3';