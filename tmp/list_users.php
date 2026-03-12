<?php
require_once __DIR__ . '/../server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../server/.env');

$pdo = Database::getConnection();
$users = $pdo->query("SELECT name, email, role FROM users")->fetchAll(PDO::FETCH_ASSOC);
print_r($users);
