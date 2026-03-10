-- Migration: Add admin role and class join codes
-- Target: users, classes
SET FOREIGN_KEY_CHECKS = 0;
-- 1. Add 'admin' to users.role ENUM
ALTER TABLE users
MODIFY COLUMN role ENUM('teacher', 'student', 'admin') NOT NULL;
-- 2. Add join_code to classes
ALTER TABLE classes
ADD COLUMN join_code VARCHAR(10) UNIQUE DEFAULT NULL
AFTER teacher_id;
-- 3. Populate existing classes with random join codes (optional, but good for consistency)
-- For now, we'll just leave them NULL or let the repository handle it upon update.
-- Alternatively, a simple update:
UPDATE classes
SET join_code = SUBSTRING(MD5(RAND()), 1, 6)
WHERE join_code IS NULL;
SET FOREIGN_KEY_CHECKS = 1;