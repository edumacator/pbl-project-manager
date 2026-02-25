<?php

namespace App\Repositories\MySQL;

use App\Domain\ClassEntity;
use App\Domain\User;
use App\Repositories\ClassRepositoryInterface;
use PDO;

class ClassRepository implements ClassRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
        if (!$this->pdo) {
            throw new \RuntimeException("ClassRepository: Database connection failed.");
        }
    }

    public function create(ClassEntity $class): int
    {
        $stmt = $this->pdo->prepare("INSERT INTO classes (name, teacher_id) VALUES (:name, :teacher_id)");
        $stmt->execute([
            ':name' => $class->name,
            ':teacher_id' => $class->teacherId
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function update(ClassEntity $class): bool
    {
        $stmt = $this->pdo->prepare("UPDATE classes SET name = :name WHERE id = :id");
        return $stmt->execute([
            ':name' => $class->name,
            ':id' => $class->id
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE classes SET deleted_at = NOW() WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function restore(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE classes SET deleted_at = NULL WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function findById(int $id): ?ClassEntity
    {
        $stmt = $this->pdo->prepare("SELECT * FROM classes WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row)
            return null;

        return new ClassEntity(
            $row['name'],
            (int) $row['teacher_id'],
            (int) $row['id'],
            $row['created_at'],
            $row['deleted_at'] ?? null
        );
    }

    public function findByTeacherId(int $teacherId, bool $includeDeleted = false): array
    {
        $sql = "SELECT * FROM classes WHERE teacher_id = :teacher_id";
        if (!$includeDeleted) {
            $sql .= " AND deleted_at IS NULL";
        }
        $sql .= " ORDER BY name ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':teacher_id' => $teacherId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $classes = [];
        foreach ($rows as $row) {
            $classes[] = new ClassEntity(
                $row['name'],
                (int) $row['teacher_id'],
                (int) $row['id'],
                $row['created_at'],
                $row['deleted_at'] ?? null
            );
        }
        return $classes;
    }

    public function enrollStudent(int $classId, int $studentId): bool
    {
        // Use INSERT IGNORE to avoid errors on duplicate enrollment
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO class_enrollments (class_id, student_id) VALUES (:class_id, :student_id)");
        return $stmt->execute([
            ':class_id' => $classId,
            ':student_id' => $studentId
        ]);
    }

    public function getStudents(int $classId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT u.* 
            FROM users u
            JOIN class_enrollments ce ON u.id = ce.student_id
            WHERE ce.class_id = :class_id
            ORDER BY u.name ASC
        ");
        $stmt->execute([':class_id' => $classId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $students = [];
        foreach ($rows as $row) {
            $students[] = new User(
                $row['name'],
                $row['email'],
                $row['role'], // 'student'
                (int) $row['id']
            );
        }
        return $students;
    }
}
