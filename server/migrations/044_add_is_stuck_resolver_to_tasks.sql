-- Migration: Add is_stuck_resolver to tasks table
ALTER TABLE tasks ADD COLUMN is_stuck_resolver BOOLEAN DEFAULT FALSE;
