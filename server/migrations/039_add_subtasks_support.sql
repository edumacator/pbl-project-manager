-- Add subtask support to tasks table
ALTER TABLE tasks ADD COLUMN parent_task_id INT NULL AFTER team_id;
ALTER TABLE tasks ADD INDEX idx_parent_task_id (parent_task_id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_parent_task_id FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
