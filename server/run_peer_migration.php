<?php
require_once __DIR__ . '/src/autoload.php';
use App\Repositories\MySQL\Database;
use App\Env;

// Load Env
Env::load(__DIR__ . '/.env');

try {
    $pdo = Database::getConnection();
    echo "Connected.\n";

    $sql = file_get_contents(__DIR__ . '/migrations/023_peer_review_assignments.sql');
    $pdo->exec($sql);
    echo "Migration 023 executed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
