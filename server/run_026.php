<?php
require_once __DIR__ . '/src/autoload.php';
require_once __DIR__ . '/src/Env.php';
require_once __DIR__ . '/src/Repositories/MySQL/Database.php';

use App\Repositories\MySQL\Database;
use App\Env;

Env::load(__DIR__ . '/.env');

try {
    $pdo = Database::getConnection();
    $sql = file_get_contents(__DIR__ . '/migrations/026_add_team_member_role.sql');
    $pdo->exec($sql);
    echo "Migration 026 executed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
