<?php
require_once '/Antigravity_Projects/project-management/server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load('/Antigravity_Projects/project-management/server/.env');

try {
    $pdo = Database::getConnection();

    echo "Current Column Definition:\n";
    $stmt = $pdo->query("DESCRIBE tasks priority");
    print_r($stmt->fetch());

    echo "\nCurrent Data Distribution:\n";
    $stmt = $pdo->query("SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority");
    print_r($stmt->fetchAll());

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
