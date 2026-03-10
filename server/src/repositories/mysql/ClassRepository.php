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
        $joinCode = substr(md5(uniqid(mt_rand(), true)), 0, 6);
        $stmt = $this->pdo->prepare("INSERT INTO classes (name, teacher_id, join_code) VALUES (:name, :teacher_id, :join_code)");
        $stmt->execute([
            ':name' => $class->name,
            ':teacher_id' => $class->teacherId,
            ':join_code' => $joinCode
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
            $row['deleted_at'] ?? null,
            $row['join_code'] ?? null
        );
    }

    public function findByJoinCode(string $code): ?ClassEntity
    {
        $stmt = $this->pdo->prepare("SELECT * FROM classes WHERE join_code = :code AND deleted_at IS NULL");
        $stmt->execute([':code' => $code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row)
            return null;

        return new ClassEntity(
            $row['name'],
            (int) $row['teacher_id'],
            (int) $row['id'],
            $row['created_at'],
            $row['deleted_at'] ?? null,
            $row['join_code']
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
                $row['deleted_at'] ?? null,
                $row['join_code'] ?? null
            );
        }
        return $classes;
    }

    public function findAllWithTeachers(): array
    {
        $sql = "
            SELECT c.*, u.name as teacher_name 
            FROM classes c
            JOIN users u ON c.teacher_id = u.id
            WHERE c.deleted_at IS NULL
            ORDER BY u.name ASC, c.name ASC
        ";
        $stmt = $this->pdo->query($sql);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $classes = [];
        foreach ($rows as $row) {
            $classes[] = [
                'class' => new ClassEntity(
                    $row['name'],
                    (int) $row['teacher_id'],
                    (int) $row['id'],
                    $row['created_at'],
                    $row['deleted_at'] ?? null,
                    $row['join_code']
                ),
                'teacher_name' => $row['teacher_name']
            ];
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
                (int) $row['id'],
                $row['first_name'] ?? '',
                $row['last_name'] ?? ''
            );
        }
        return $students;
    }
}
