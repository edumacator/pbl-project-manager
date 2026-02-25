<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;

Env::load(__DIR__ . '/../.env');

$host = getenv('DB_HOST') ?: '127.0.0.1';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$db = getenv('DB_NAME') ?: 'pbl_manager';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = file_get_contents(__DIR__ . '/../migrations/028_auth_schema.sql');

    // Execute multiple statements
    $pdo->exec($sql);

    echo "Migration 028 executed successfully.\n";

} catch (PDOException $e) {
    die("Error during migration 028: " . $e->getMessage() . "\n");
}
