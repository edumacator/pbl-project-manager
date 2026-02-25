<?php
require __DIR__ . '/../src/Env.php';
require __DIR__ . '/../src/repositories/mysql/Database.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');
$pdo = Database::getConnection();

echo "--- TEAMS ---\n";
$stmt = $pdo->query("SELECT * FROM teams");
$teams = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($teams);

echo "\n--- TASKS ---\n";
// join tasks with teams to see which team they belong to
$stmt = $pdo->query("
    SELECT t.id, t.project_id, t.team_id, team.name as team_name, t.title 
    FROM tasks t
    LEFT JOIN teams team ON t.team_id = team.id
");
$tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($tasks);
