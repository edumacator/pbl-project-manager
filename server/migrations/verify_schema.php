<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected.\n";

    echo "--- PROJECTS Columns ---\n";
    $stmt = $pdo->query("DESCRIBE projects");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        echo $row['Field'] . " (" . $row['Type'] . ")\n";
    }

    echo "\n--- CHECKPOINTS Columns ---\n";
    $stmt = $pdo->query("DESCRIBE checkpoints");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        echo $row['Field'] . " (" . $row['Type'] . ")\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
