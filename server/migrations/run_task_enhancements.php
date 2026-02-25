<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

// Explicitly load .env from server root
Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    // 017
    echo "Running 017_project_reflection_toggle.sql...\n";
    $sql17 = file_get_contents(__DIR__ . '/017_project_reflection_toggle.sql');
    try {
        $pdo->exec($sql17);
        echo "Success: 017 applied.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), "Duplicate column name") !== false) {
            echo "Skipping 017: Column already exists.\n";
        } else {
            throw $e;
        }
    }

    // 018
    echo "Running 018_task_attachments.sql...\n";
    $sql18 = file_get_contents(__DIR__ . '/018_task_attachments.sql');
    $pdo->exec($sql18);
    echo "Success: 018 applied.\n";

    // 019
    echo "Running 019_make_reflections_polymorphic.sql...\n";
    $sql19 = file_get_contents(__DIR__ . '/019_make_reflections_polymorphic.sql');
    // Split potential multiple statements if driver doesn't support multi-query exec in one go (PDO usually doesn't for exec, depends)
    // Actually PDO::exec can run multiple if enabled, but better to split by ;
    // But let's try simple exec first. If it fails on multi-statement, we split.
    // NOTE: simple sql files here might have comments.
    // Let's just try running it. If error, we might need a better runner.
    // Or just run statements one by one.

    // Naive split by semicolon for 019
    $statements = array_filter(array_map('trim', explode(';', $sql19)));
    foreach ($statements as $stmt) {
        if (!empty($stmt)) {
            try {
                $pdo->exec($stmt);
            } catch (PDOException $e) {
                // Ignore "link already exists" or similar if re-running
                if (strpos($e->getMessage(), "Duplicate column name") !== false) {
                    echo "Skipping statement (duplicate column): " . substr($stmt, 0, 50) . "...\n";
                } elseif (strpos($e->getMessage(), "Duplicate key name") !== false) {
                    echo "Skipping statement (duplicate key): " . substr($stmt, 0, 50) . "...\n";
                } else {
                    throw $e;
                }
            }
        }
    }
    echo "Success: 019 applied.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
