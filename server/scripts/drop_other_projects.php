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

    // Find the teacher by email
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute(['kents@fultonschools.org']);
    $teacher = $stmt->fetch();

    if (!$teacher) {
        // sometimes the 'name' column acts as email during testing depending on how it was seeded
        $stmt = $pdo->prepare('SELECT id FROM users WHERE name = ?');
        $stmt->execute(['kents@fultonschools.org']);
        $teacher = $stmt->fetch();
    }

    if (!$teacher) {
        die("Teacher kents@fultonschools.org not found in the database.\n");
    }

    $teacher_id = $teacher['id'];
    echo "Found teacher ID: $teacher_id\n";

    // Drop all projects not associated with this teacher
    $stmt = $pdo->prepare('DELETE FROM projects WHERE teacher_id != ? OR teacher_id IS NULL');
    $stmt->execute([$teacher_id]);

    $deleted = $stmt->rowCount();
    echo "Deleted $deleted projects not associated with kents@fultonschools.org.\n";

} catch (\PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
    exit(1);
}
