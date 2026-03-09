<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

// Load .env
Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    $file = __DIR__ . '/036_task_checklist_items.sql';
    $filename = basename($file);
    echo "Running $filename...\n";

    $sql = file_get_contents($file);
    if (trim($sql) === '') {
        echo "Skipping empty file $filename\n";
    } else {
        $pdo->exec($sql);
        echo "Success: $filename\n";
    }

    echo "Migration complete.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
