<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->query('SELECT id, name, email, role FROM users');
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    print_r($users);

} catch (Exception $e) {
    die("Query failed: " . $e->getMessage() . "\n");
}
