# Database Changelog

This document tracks all changes made to the production database after the initial deployment on 2026-02-23.

## [2026-02-23] Initial Setup
- Initialized production database with `schema.sql`.
- Seeded initial teacher account (Scott Kent).

### SQL Applied:
```sql
INSERT INTO users (first_name, last_name, name, email, password_hash, role) 
VALUES ('Scott', 'Kent', 'Scott Kent', 'kents@fultonschools.org', '$2y$12$JtO9zHcK3SLIdd0Bo8UhlOw8QpwlIyTn7hQyKzhhUj2FXafOVTqyq', 'teacher');
```

## [2026-02-23] Schema Correction
- Resolved "Column not found" and "Table not found" errors by updating the database to match the application code.

### SQL to Apply:
```sql
-- 1. Add missing due_date to tasks
ALTER TABLE tasks ADD COLUMN due_date DATETIME DEFAULT NULL AFTER team_id;

-- 2. Add missing junction table for projects/classes
CREATE TABLE IF NOT EXISTS project_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    class_id INT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (project_id, class_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
```
