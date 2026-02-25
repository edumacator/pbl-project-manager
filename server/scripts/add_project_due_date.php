<?php

$pdo = require_once __DIR__ . '/../public/database.php';

try {
    // Add due_date to projects
    $pdo->exec("ALTER TABLE projects ADD COLUMN due_date DATETIME NULL AFTER description");
    echo "Added due_date to projects table.\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
