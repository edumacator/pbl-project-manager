<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Repositories\MySQL\Database;
App\Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/044_add_is_stuck_resolver_to_tasks.sql');
    $pdo->exec($sql);
    echo "Migration 044 (Task Resolver Flag) run successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
