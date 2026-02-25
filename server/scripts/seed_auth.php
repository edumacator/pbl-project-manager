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

    // 1. Create or Update kents@fultonschools.org
    $kentSql = "SELECT id FROM users WHERE email = 'kents@fultonschools.org'";
    $stmt = $pdo->query($kentSql);
    $kentId = $stmt->fetchColumn();

    $kentHash = password_hash('password', PASSWORD_DEFAULT);

    if ($kentId) {
        $pdo->prepare("UPDATE users SET first_name = 'Kent', last_name = 'S', role = 'teacher', password_hash = ? WHERE id = ?")
            ->execute([$kentHash, $kentId]);
    } else {
        $pdo->prepare("INSERT INTO users (first_name, last_name, name, email, role, password_hash) VALUES ('Kent', 'S', 'Kent S', 'kents@fultonschools.org', 'teacher', ?)")
            ->execute([$kentHash]);
        $kentId = $pdo->lastInsertId();
    }
    echo "Kent assigned ID: {$kentId}\n";

    // 2. Create or Update teacher@fultonschools.org
    $teacherSql = "SELECT id FROM users WHERE email = 'teacher@fultonschools.org'";
    $stmt = $pdo->query($teacherSql);
    $teacherId = $stmt->fetchColumn();

    $teacherHash = password_hash('password', PASSWORD_DEFAULT);

    if ($teacherId) {
        $pdo->prepare("UPDATE users SET first_name = 'Test', last_name = 'Teacher', role = 'teacher', password_hash = ? WHERE id = ?")
            ->execute([$teacherHash, $teacherId]);
    } else {
        $pdo->prepare("INSERT INTO users (first_name, last_name, name, email, role, password_hash) VALUES ('Test', 'Teacher', 'Test Teacher', 'teacher@fultonschools.org', 'teacher', ?)")
            ->execute([$teacherHash]);
    }
    echo "Test Teacher processed.\n";

    // 3. Reassign all existing projects to Kent
    $pdo->prepare("UPDATE projects SET teacher_id = ?")->execute([$kentId]);
    echo "All existing projects reassigned to Kent's ID ({$kentId}).\n";

    // 4. Also set dummy passwords for everyone else who doesn't have one, just in case
    $pdo->prepare("UPDATE users SET password_hash = ? WHERE password_hash IS NULL")->execute([password_hash('student123', PASSWORD_DEFAULT)]);
    echo "Set default passwords for all other existing users.\n";

    echo "Seed completed successfully.\n";

} catch (PDOException $e) {
    die("Error during auth seeding: " . $e->getMessage() . "\n");
}
