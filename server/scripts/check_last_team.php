<?php
require 'src/Env.php';
\App\Env::load('.env');
require 'src/autoload.php';

$pdo = \App\Repositories\MySQL\Database::getConnection();
$stmt = $pdo->query('SELECT id, name FROM teams ORDER BY id DESC LIMIT 5');
$teams = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Last 5 Teams:\n";
print_r($teams);

$teamId = $teams[0]['id'] ?? null;
if ($teamId) {
    $stmt = $pdo->prepare('SELECT id, team_id, title FROM tasks WHERE team_id = :team_id');
    $stmt->execute([':team_id' => $teamId]);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\nTasks for team $teamId:\n";
    print_r($tasks);
}
