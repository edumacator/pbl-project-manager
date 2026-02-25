<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
Env::load(__DIR__ . '/../.env');

try {
    $pdo = \App\Repositories\MySQL\Database::getConnection();
    $stmt = $pdo->query("DESCRIBE tasks");
    $cols = $stmt->fetchAll(\PDO::FETCH_ASSOC);
    foreach ($cols as $col) {
        echo $col['Field'] . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
