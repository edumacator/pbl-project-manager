<?php

require_once __DIR__ . '/../src/Env.php';
\App\Env::load(__DIR__ . '/../.env');

try {
    $db = new PDO(
        sprintf("mysql:host=%s;dbname=%s;charset=utf8mb4", $_ENV['DB_HOST'] ?? 'localhost', $_ENV['DB_NAME'] ?? 'pbl_manager'),
        $_ENV['DB_USER'] ?? 'root',
        $_ENV['DB_PASS'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $sql = "CREATE TABLE IF NOT EXISTS notification_dismissals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, message_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES task_messages(id) ON DELETE CASCADE
);";
    $db->exec($sql);
    echo "Migration 045 applied successfully.\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
