<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    echo "Running 021_add_project_critique_toggle.sql...\n";
    $sql21 = file_get_contents(__DIR__ . '/021_add_project_critique_toggle.sql');
    try {
        $pdo->exec($sql21);
        echo "Success: 021 applied.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), "Duplicate column name") !== false) {
            echo "Skipping 021: Column already exists.\n";
        } else {
            throw $e;
        }
    }

    echo "Running 022_feedback_entries.sql...\n";
    $sql22 = file_get_contents(__DIR__ . '/022_feedback_entries.sql');
    $pdo->exec($sql22);
    echo "Success: 022 applied.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
