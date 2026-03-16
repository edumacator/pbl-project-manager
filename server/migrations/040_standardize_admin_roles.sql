-- Migration 040: Standardize Admin Roles
-- Rename teacher_id to author_id in projects and staff_id in classes for role neutrality

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Ensure 'admin' is in the users.role ENUM (redundant but safe for remote)
ALTER TABLE users 
MODIFY COLUMN role ENUM('teacher', 'student', 'admin') NOT NULL;

-- 2. Rename teacher_id to author_id in projects
ALTER TABLE projects
CHANGE COLUMN teacher_id author_id INT;

-- 3. Rename teacher_id to staff_id in classes
ALTER TABLE classes
CHANGE COLUMN teacher_id staff_id INT NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
