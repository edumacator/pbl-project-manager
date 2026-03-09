<?php
// Migration: run_028_milestone_reviews.php

require_once __DIR__ . '/../src/repositories/MySQL/Database.php';

// Simple .env loader
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0)
            continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
}

try {
    $pdo = \App\Repositories\MySQL\Database::getConnection();

    // 1. Add checkpoint_id to peer_review_assignments if it doesn't exist
    $columns = $pdo->query("SHOW COLUMNS FROM peer_review_assignments LIKE 'checkpoint_id'")->fetchAll();
    if (empty($columns)) {
        $pdo->exec("ALTER TABLE peer_review_assignments ADD COLUMN checkpoint_id INT NULL AFTER task_id");
        $pdo->exec("ALTER TABLE peer_review_assignments ADD CONSTRAINT fk_pra_checkpoint FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id) ON DELETE SET NULL");
        echo "Column checkpoint_id added.\n";
    } else {
        echo "Column checkpoint_id already exists.\n";
    }

    echo "Migration 028: Milestone Reviews support added successfully (minimal mode).\n";
} catch (\Exception $e) {
    if (strpos($e->getMessage(), "Duplicate column name") !== false) {
        echo "Migration 028: Column already exists, proceeding.\n";
    } else {
        echo "Migration 028 Error: " . $e->getMessage() . "\n";
    }
}
