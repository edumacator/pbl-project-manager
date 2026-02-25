<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

// Load .env
Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    $file = __DIR__ . '/013_task_timing_and_dependencies.sql';
    $filename = basename($file);
    echo "Running $filename...\n";
    $sql = file_get_contents($file);

    // Split by semicolon and run each statement
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    foreach ($statements as $stmt) {
        if (empty($stmt))
            continue;
        try {
            $pdo->exec($stmt);
            echo "Executed: " . substr($stmt, 0, 50) . "...\n";
        } catch (PDOException $e) {
            // Error 1060: Duplicate column name
            if ($e->errorInfo[1] == 1060) {
                echo "Skipping (already exists): " . substr($stmt, 0, 50) . "...\n";
            } else {
                echo "Error executing statement: " . $stmt . "\n";
                echo "Error: " . $e->getMessage() . "\n";
                exit(1);
            }
        }
    }

    echo "Migration 013 complete.\n";
} catch (Exception $e) {
    echo "Connection Error: " . $e->getMessage() . "\n";
    echo "Ensure your database exists and credentials are correct.\n";
    exit(1);
}
