-- Migration 030: Add manual sort order to tasks for timeline drag and drop
ALTER TABLE tasks
ADD COLUMN sort_order INT NOT NULL DEFAULT 0
AFTER end_date;