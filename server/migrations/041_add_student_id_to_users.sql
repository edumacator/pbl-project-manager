-- Migration 041: Add student_id to users for cross-platform identification
ALTER TABLE users ADD COLUMN student_id VARCHAR(50) NULL AFTER role;
