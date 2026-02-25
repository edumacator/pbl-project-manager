-- Add soft delete and explicit end date to tasks
ALTER TABLE tasks
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE tasks
ADD COLUMN end_date DATE NULL DEFAULT NULL;
-- Migrate existing duration_days data to end_date if possible (basic estimation)
UPDATE tasks
SET end_date = DATE_ADD(start_date, INTERVAL duration_days DAY)
WHERE start_date IS NOT NULL
    AND duration_days > 0
    AND end_date IS NULL;