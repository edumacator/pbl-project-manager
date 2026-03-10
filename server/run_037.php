<?php
require_once __DIR__ . '/src/autoload.php';
use App\Repositories\MySQL\Database;
App\Env::load(__DIR__ . '/.env');

try {
    $pdo = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/migrations/037_admin_role_and_join_codes.sql');
    $pdo->exec($sql);
    echo "Migration 037 run successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
