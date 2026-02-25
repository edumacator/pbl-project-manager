<?php
require __DIR__ . '/../src/Env.php';
require __DIR__ . '/../src/repositories/mysql/Database.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');
$pdo = Database::getConnection();

$sql = file_get_contents(__DIR__ . '/../migrations/014_class_milestones.sql');
try {
    $pdo->exec($sql);
    echo "Migration 014 run successfully.\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
