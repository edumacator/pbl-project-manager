<?php
require_once __DIR__ . '/../server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../server/.env');

try {
    $pdo = Database::getConnection();
    $stmt = $pdo->query("DESCRIBE tasks");
    $cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        if ($col['Field'] === 'priority') {
            echo "Priority Column: " . $col['Type'] . " (Default: " . $col['Default'] . ")\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
