-- Migration: Add resolution column to task_stuck_logs
ALTER TABLE task_stuck_logs
ADD COLUMN resolution VARCHAR(255) NULL AFTER next_action_text;
