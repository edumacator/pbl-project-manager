<?php
require_once __DIR__ . '/../src/Env.php';
\App\Env::load(__DIR__ . '/../.env');

$host = getenv('DB_HOST') ?: 'localhost';
$db = getenv('DB_NAME') ?: 'pbl_project_management';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: 'Timo878!Placat';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    $stmt = $pdo->query('SELECT id, title, teacher_id, deleted_at FROM projects');
    $projects = $stmt->fetchAll();

    foreach ($projects as $p) {
        echo "ID: {$p['id']} | Title: {$p['title']} | Teacher ID: {$p['teacher_id']} | Deleted: " . ($p['deleted_at'] ?? 'NULL') . "\n";
    }

    // Check project 20
    $stmt = $pdo->query('SELECT id, title, teacher_id, deleted_at FROM projects WHERE id = 20');
    $p20 = $stmt->fetch();
    if ($p20) {
        echo "\nProject 20 Details:\n";
        print_r($p20);
    } else {
        echo "\nProject 20 NOT FOUND in DB.\n";
    }
} catch (\PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
