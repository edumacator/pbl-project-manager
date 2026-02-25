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

    // Get Kent's ID
    $kentSql = "SELECT id FROM users WHERE email = 'kents@fultonschools.org'";
    $stmt = $pdo->query($kentSql);
    $kentId = $stmt->fetchColumn();

    if ($kentId) {
        $pdo->prepare("UPDATE classes SET teacher_id = ?")->execute([$kentId]);
        echo "Successfully reassigned all classes to Kent's ID ({$kentId}).\n";
    } else {
        echo "Error: Kent's user account not found.\n";
    }
} catch (PDOException $e) {
    die("Database Error: " . $e->getMessage() . "\n");
}
