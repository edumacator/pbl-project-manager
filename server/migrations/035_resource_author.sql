ALTER TABLE project_resources
ADD COLUMN user_id INT NULL DEFAULT NULL
AFTER project_id;
ALTER TABLE project_resources
ADD CONSTRAINT fk_project_resources_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
SET NULL;