-- Migration 009: Project and Class Soft Deletion
ALTER TABLE projects
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE classes
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;