<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    echo "Running 020_add_milestone_reflection_toggle.sql...\n";
    $sql = file_get_contents(__DIR__ . '/020_add_milestone_reflection_toggle.sql');
    try {
        $pdo->exec($sql);
        echo "Success: 020 applied.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), "Duplicate column name") !== false) {
            echo "Skipping 020: Column already exists.\n";
        } else {
            throw $e;
        }
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
