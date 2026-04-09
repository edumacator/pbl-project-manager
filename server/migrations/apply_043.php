<?php
require_once __DIR__ . '/../src/repositories/mysql/Database.php';

try {
    // Load .env
    $dotenv = parse_ini_file(__DIR__ . '/../.env');
    $host = $dotenv['DB_HOST'] ?? 'localhost';
    $dbname = $dotenv['DB_NAME'] ?? 'pbl_project_management';
    $user = $dotenv['DB_USER'] ?? 'root';
    $pass = $dotenv['DB_PASS'] ?? 'Timo878!Placat';
    $port = $dotenv['DB_PORT'] ?? '3306';

    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = file_get_contents(__DIR__ . '/043_add_is_stuck_resolver_to_checklist.sql');
    $pdo->exec($sql);
    echo "Migration 043 applied successfully!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
