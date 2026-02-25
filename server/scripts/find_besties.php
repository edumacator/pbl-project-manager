<?php
require __DIR__ . '/../src/Env.php';
require __DIR__ . '/../src/repositories/mysql/Database.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');
$pdo = Database::getConnection();

echo "--- Looking for 'The Besties' ---\n";
$stmt = $pdo->prepare("SELECT * FROM teams WHERE name LIKE :name");
$stmt->execute([':name' => '%Besties%']);
$teams = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($teams);

if (!empty($teams)) {
    foreach ($teams as $team) {
        $teamId = $team['id'];
        echo "\n--- Tasks for Team ID $teamId ---\n";
        $stmt = $pdo->prepare("SELECT * FROM tasks WHERE team_id = :team_id");
        $stmt->execute([':team_id' => $teamId]);
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        print_r($tasks);
    }
} else {
    echo "Team not found.\n";
}
