<?php
require_once __DIR__ . '/src/autoload.php';
require_once __DIR__ . '/src/Env.php';
require_once __DIR__ . '/src/Repositories/MySQL/Database.php';

use App\Repositories\MySQL\Database;
use App\Env;

Env::load(__DIR__ . '/.env');

try {
    $pdo = Database::getConnection();

    echo "=== USERS ===\n";
    $stmt = $pdo->query("SELECT id, name, email FROM users");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        print_r($row);
    }

    echo "\n=== PEER REVIEW ASSIGNMENTS ===\n";
    $stmt = $pdo->query("SELECT * FROM peer_review_assignments");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        print_r($row);
    }

    echo "\n=== TASK ATTACHMENTS ===\n";
    $stmt = $pdo->query("SELECT * FROM task_attachments");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        print_r($row);
    }

    echo "\n=== TASKS ===\n";
    $stmt = $pdo->query("SELECT id, title, project_id, assignee_id FROM tasks LIMIT 5");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        print_r($row);
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
