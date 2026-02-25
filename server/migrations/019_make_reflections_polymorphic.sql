-- Make checkpoint_id nullable
ALTER TABLE reflections
MODIFY COLUMN checkpoint_id INT NULL;
-- Add task_id column
ALTER TABLE reflections
ADD COLUMN task_id INT NULL
AFTER checkpoint_id;
-- Add foreign key for task_id (if tasks table exists)
ALTER TABLE reflections
ADD CONSTRAINT fk_reflections_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
-- Optional: Ensure at least one is set? 
-- In MySQL 8.0.16+ CHECK constraint works, but older versions ignore it. 
-- We'll handle logic in application layer for now to be safe.