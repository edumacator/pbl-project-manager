<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Seeding expanded dataset...\n";

    // 1. Ensure Teacher Exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute(['teacher@example.com']);
    $teacherId = $stmt->fetchColumn();

    if (!$teacherId) {
        $pdo->prepare("INSERT INTO users (name, email, role) VALUES (?, ?, ?)")
            ->execute(['Teacher', 'teacher@example.com', 'teacher']);
        $teacherId = $pdo->lastInsertId();
        echo "Created Teacher (ID: $teacherId)\n";
    } else {
        echo "Teacher exists (ID: $teacherId)\n";
    }

    // 2. Create Classes
    $classes = ['Period 1 - Physics', 'Period 2 - Chemistry'];
    $classIds = [];

    foreach ($classes as $className) {
        $stmt = $pdo->prepare("SELECT id FROM classes WHERE name = ?");
        $stmt->execute([$className]);
        $id = $stmt->fetchColumn();

        if (!$id) {
            $pdo->prepare("INSERT INTO classes (name, teacher_id) VALUES (?, ?)")
                ->execute([$className, $teacherId]);
            $id = $pdo->lastInsertId();
            echo "Created Class: $className (ID: $id)\n";
        } else {
            echo "Class exists: $className (ID: $id)\n";
        }
        $classIds[] = $id;
    }

    // 3. Create 50 Students and Enroll
    echo "Creating/Enrolling 50 Students...\n";
    $pdo->beginTransaction();

    for ($i = 1; $i <= 50; $i++) {
        $email = "student$i@example.com";
        $name = "Student $i";

        // Create User
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $studentId = $stmt->fetchColumn();

        if (!$studentId) {
            $pdo->prepare("INSERT INTO users (name, email, role) VALUES (?, ?, ?)")
                ->execute([$name, $email, 'student']);
            $studentId = $pdo->lastInsertId();
        }

        // Enroll
        // Students 1-25 -> Class 1
        // Students 26-50 -> Class 2
        $classIndex = ($i <= 25) ? 0 : 1;
        $classId = $classIds[$classIndex];

        $pdo->prepare("INSERT IGNORE INTO class_enrollments (class_id, student_id) VALUES (?, ?)")
            ->execute([$classId, $studentId]);
    }

    $pdo->commit();
    echo "Seeding completed successfully.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    die("Seeding failed: " . $e->getMessage() . "\n");
}
