<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();

    $c = $pdo->query('SELECT count(*) FROM classes')->fetchColumn();
    $cc = $pdo->query('SELECT count(*) FROM classes WHERE deleted_at IS NULL')->fetchColumn();

    $p = $pdo->query('SELECT count(*) FROM projects')->fetchColumn();
    $pp = $pdo->query('SELECT count(*) FROM projects WHERE deleted_at IS NULL')->fetchColumn();

    echo "Total Classes: $c (Active: $cc)\n";
    echo "Total Projects: $p (Active: $pp)\n";

} catch (Exception $e) {
    die("Query failed: " . $e->getMessage() . "\n");
}
