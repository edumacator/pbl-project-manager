<?php
require_once __DIR__ . '/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

// Load Env
Env::load(__DIR__ . '/.env');

try {
    $pdo = Database::getConnection();

    echo "Running migration 038: Task Priorities...\n";
    $sql = file_get_contents(__DIR__ . '/migrations/038_task_priorities.sql');

    // Split by semicolon and execute each part
    $statements = explode(';', $sql);
    foreach ($statements as $stmt) {
        $stmt = trim($stmt);
        if (!empty($stmt)) {
            $pdo->exec($stmt);
            echo "Executed: " . substr($stmt, 0, 50) . "...\n";
        }
    }

    echo "Migration 038 completed successfully.\n";
} catch (Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
    exit(1);
}
