<?php
require_once __DIR__ . '/src/repositories/mysql/Database.php';

$pdo = \App\Repositories\MySQL\Database::getConnection();
$stmt = $pdo->query("SELECT id, title, start_date, due_date, end_date, duration_days FROM tasks WHERE title LIKE '%Initial Research%'");
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($results);
