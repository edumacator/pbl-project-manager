ALTER TABLE checkpoints
ADD COLUMN class_id INT NULL;
ALTER TABLE checkpoints
ADD CONSTRAINT fk_checkpoints_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
-- Make project_id nullable if it isn't already, or allow checkpoints to have EITHER project_id OR class_id
ALTER TABLE checkpoints
MODIFY COLUMN project_id INT NULL;