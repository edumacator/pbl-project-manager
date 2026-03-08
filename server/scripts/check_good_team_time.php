<?php
require 'src/Env.php';
\App\Env::load('.env');
require 'src/autoload.php';

$pdo = \App\Repositories\MySQL\Database::getConnection();
$stmt = $pdo->query("SELECT id, project_id, name, created_at FROM teams WHERE name = 'Good Team'");
$teams = $stmt->fetchAll(PDO::FETCH_ASSOC);

print_r($teams);
