<?php
require 'src/Env.php';
\App\Env::load('.env');
require 'src/autoload.php';
$pdo = \App\Repositories\MySQL\Database::getConnection();
$stmt = $pdo->query('SELECT id, project_id, team_id, title FROM tasks');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
