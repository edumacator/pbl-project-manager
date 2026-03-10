<?php
require_once __DIR__ . '/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/.env');

try {
    $db = Database::getConnection();
    $stmt = $db->query("SELECT id, name, first_name, last_name, email, role FROM users WHERE first_name LIKE '%Scott%' OR last_name LIKE '%Kent%'");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($users, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo $e->getMessage();
}
