<?php
require_once __DIR__ . '/../server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../server/.env');

$pdo = Database::getConnection();

// 1. Get user ID for kents@fultonschools.org
$stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE email = ?");
$stmt->execute(['kents@fultonschools.org']);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("User kents@fultonschools.org not found\n");
}

echo "User: " . print_r($user, true) . "\n";

// 2. Find classes for this user
$stmt = $pdo->prepare("SELECT * FROM classes WHERE teacher_id = ?");
$stmt->execute([$user['id']]);
$classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Classes specifically assigned to this user:\n";
print_r($classes);

// 3. Just to see if there are ANY classes
$allClasses = $pdo->query("SELECT c.*, u.email as teacher_email FROM classes c JOIN users u ON c.teacher_id = u.id")->fetchAll(PDO::FETCH_ASSOC);
echo "All classes in DB:\n";
foreach($allClasses as $c) {
    echo "- ID: {$c['id']}, Name: {$c['name']}, Teacher Email: {$c['teacher_email']}\n";
}

// 4. Check for enrollment too? kents@ might be a student in some?
$stmt = $pdo->prepare("SELECT c.* FROM classes c JOIN class_enrollments ce ON c.id = ce.class_id WHERE ce.student_id = ?");
$stmt->execute([$user['id']]);
$enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Enrollments for this user:\n";
print_r($enrollments);
