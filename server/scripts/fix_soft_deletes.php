<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();

    // Classes table
    $stmt = $pdo->query("SHOW COLUMNS FROM classes LIKE 'deleted_at'");
    if ($stmt->rowCount() === 0) {
        $pdo->exec("ALTER TABLE classes ADD COLUMN deleted_at TIMESTAMP NULL;");
        echo "Added 'deleted_at' to 'classes' table.\n";
    } else {
        echo "'deleted_at' already exists in 'classes' table.\n";
    }

    // Projects table
    $stmt = $pdo->query("SHOW COLUMNS FROM projects LIKE 'deleted_at'");
    if ($stmt->rowCount() === 0) {
        $pdo->exec("ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP NULL;");
        echo "Added 'deleted_at' to 'projects' table.\n";
    } else {
        echo "'deleted_at' already exists in 'projects' table.\n";
    }

    echo "Soft delete schema fix completed.\n";

} catch (Exception $e) {
    die("Fix failed: " . $e->getMessage() . "\n");
}
