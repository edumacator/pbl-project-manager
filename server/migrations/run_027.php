<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;

Env::load(__DIR__ . '/../.env');

$host = getenv('DB_HOST') ?: '127.0.0.1';
$db = getenv('DB_NAME') ?: 'pdl_db';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $sql = file_get_contents(__DIR__ . '/027_project_default_tasks.sql');
    $pdo->exec($sql);
    echo "Migration 027 (default tasks) applied successfully.\n";
} catch (\PDOException $e) {
    if ($e->getCode() === '42S21') { // Column already exists
        echo "Column default_tasks already exists. Skipping.\n";
    } else {
        echo "Migration failed: " . $e->getMessage() . "\n";
    }
}
