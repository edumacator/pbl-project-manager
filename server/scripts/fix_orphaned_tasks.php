<?php
require __DIR__ . '/../src/Env.php';
require __DIR__ . '/../src/repositories/mysql/Database.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');
$pdo = Database::getConnection();

echo "--- Fixing Orphaned Tasks ---\n";
// Assign tasks 4 and 5 to Team 7 (The Besties)
$stmt = $pdo->prepare("UPDATE tasks SET team_id = 7 WHERE id IN (4, 5) AND team_id IS NULL");
$stmt->execute();
echo 'Updated ' . $stmt->rowCount() . ' tasks (4, 5) to Team 7.' . "\n";
