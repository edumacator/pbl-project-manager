<?php
require 'src/Env.php';
\App\Env::load('.env');
require 'src/autoload.php';

$pdo = \App\Repositories\MySQL\Database::getConnection();
$stmt = $pdo->query('SELECT id, name FROM teams');
$teams = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Teams:\n";
print_r($teams);

$stmt = $pdo->query('SELECT id, team_id, title FROM tasks');
$tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "\nTasks:\n";
print_r($tasks);
