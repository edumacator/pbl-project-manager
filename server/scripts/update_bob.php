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

    $email = 'bob@school.org';
    $password = 'studentpass';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE email = ?');
    $stmt->execute([$hash, $email]);

    if ($stmt->rowCount() > 0) {
        echo "Password updated successfully for $email\n";
    } else {
        echo "No rows updated. Does $email exist?\n";
    }
} catch (PDOException $e) {
    echo "Error updating password: " . $e->getMessage() . "\n";
}
