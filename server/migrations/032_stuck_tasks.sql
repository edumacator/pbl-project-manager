-- Adding tracking for stuck tasks
ALTER TABLE tasks
ADD COLUMN is_stuck BOOLEAN DEFAULT FALSE
AFTER status;
-- Table to log the action tree responses
CREATE TABLE IF NOT EXISTS task_stuck_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    action_taken VARCHAR(255) NOT NULL,
    next_action_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;