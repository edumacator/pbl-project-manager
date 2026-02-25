-- Migration 029: Add Team Scoping to Project Resources
ALTER TABLE project_resources
ADD COLUMN team_id INT NULL
AFTER project_id;
ALTER TABLE project_resources
ADD CONSTRAINT fk_pr_team_id FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;