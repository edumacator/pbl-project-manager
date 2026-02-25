-- Add timing fields to tasks
ALTER TABLE tasks
ADD COLUMN start_date DATE NULL;
ALTER TABLE tasks
ADD COLUMN duration_days INT DEFAULT 1;
-- Add is_hard_deadline to checkpoints (milestones)
ALTER TABLE checkpoints
ADD COLUMN is_hard_deadline BOOLEAN DEFAULT FALSE;
-- Create a self-referencing table for task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    -- The task that is blocked
    depends_on_id INT NOT NULL,
    -- The task that must be finished first
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dependency (task_id, depends_on_id)
);