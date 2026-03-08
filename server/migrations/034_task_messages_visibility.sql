ALTER TABLE task_messages
ADD COLUMN visibility ENUM('team', 'teacher') DEFAULT 'team'
AFTER message;