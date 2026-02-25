<?php

namespace App\Repositories\MySQL;

use App\Domain\Project;
use App\Repositories\ProjectRepositoryInterface;
use PDO;

class ProjectRepository implements ProjectRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(Project $project): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO projects (title, driving_question, description, teacher_id, due_date, requires_reflection, requires_milestone_reflection, require_critique, default_tasks)
            VALUES (:title, :driving_question, :description, :teacher_id, :due_date, :requires_reflection, :requires_milestone_reflection, :require_critique, :default_tasks)
        ");

        $stmt->execute([
            ':title' => $project->title,
            ':driving_question' => $project->drivingQuestion,
            ':description' => $project->description,
            ':teacher_id' => $project->teacherId,
            ':due_date' => $project->dueDate,
            ':requires_reflection' => $project->requiresReflection ? 1 : 0,
            ':requires_milestone_reflection' => $project->requiresMilestoneReflection ? 1 : 0,
            ':require_critique' => $project->requireCritique ? 1 : 0,
            ':default_tasks' => $project->defaultTasks ? json_encode($project->defaultTasks) : null
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function assignToClass(int $projectId, int $classId): bool
    {
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO project_classes (project_id, class_id) VALUES (:project_id, :class_id)");
        return $stmt->execute([
            ':project_id' => $projectId,
            ':class_id' => $classId
        ]);
    }

    public function syncClasses(int $projectId, array $classIds): void
    {
        $this->pdo->beginTransaction();
        try {
            // Remove existing assignments
            $stmt = $this->pdo->prepare("DELETE FROM project_classes WHERE project_id = :project_id");
            $stmt->execute([':project_id' => $projectId]);

            // Add new assignments
            $stmt = $this->pdo->prepare("INSERT INTO project_classes (project_id, class_id) VALUES (:project_id, :class_id)");
            foreach ($classIds as $classId) {
                $stmt->execute([
                    ':project_id' => $projectId,
                    ':class_id' => $classId
                ]);
            }
            $this->pdo->commit();
        } catch (\Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    public function findById(int $id): ?Project
    {
        $stmt = $this->pdo->prepare("SELECT * FROM projects WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        return $this->mapRowToProject($row);
    }

    public function findAll(bool $includeDeleted = false): array
    {
        $sql = "SELECT * FROM projects";
        if (!$includeDeleted) {
            $sql .= " WHERE deleted_at IS NULL";
        }
        $stmt = $this->pdo->query($sql);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToProject'], $rows);
    }

    public function findByClassId(int $classId, bool $includeDeleted = false): array
    {
        $sql = "
            SELECT p.* 
            FROM projects p
            JOIN project_classes pc ON p.id = pc.project_id
            WHERE pc.class_id = :class_id
        ";
        if (!$includeDeleted) {
            $sql .= " AND p.deleted_at IS NULL";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':class_id' => $classId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToProject'], $rows);
    }

    public function findByTeacherId(int $teacherId, bool $includeDeleted = false): array
    {
        // A teacher can see projects they created (teacher_id = :teacher_id)
        // OR projects assigned to classes where they are the teacher.
        // We use DISTINCT to avoid duplicates if a project is both created by them AND assigned to their class.
        $sql = "
            SELECT DISTINCT p.* 
            FROM projects p
            LEFT JOIN project_classes pc ON p.id = pc.project_id
            LEFT JOIN classes c ON pc.class_id = c.id
            WHERE (p.teacher_id = :teacher_id OR c.teacher_id = :class_teacher_id)
        ";

        if (!$includeDeleted) {
            $sql .= " AND p.deleted_at IS NULL";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':teacher_id' => $teacherId,
            ':class_teacher_id' => $teacherId
        ]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToProject'], $rows);
    }

    public function findByStudentId(int $studentId, bool $includeDeleted = false): array
    {
        // A student can see projects assigned to classes they are enrolled in.
        $sql = "
            SELECT DISTINCT p.* 
            FROM projects p
            JOIN project_classes pc ON p.id = pc.project_id
            JOIN class_enrollments ce ON pc.class_id = ce.class_id
            WHERE ce.student_id = :student_id
        ";

        if (!$includeDeleted) {
            $sql .= " AND p.deleted_at IS NULL";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':student_id' => $studentId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToProject'], $rows);
    }

    private function mapRowToProject(array $row): Project
    {
        $id = (int) $row['id'];
        $classes = $this->getClassesForProject($id);

        $classId = !empty($classes) ? (int) $classes[0]['id'] : null;

        return new Project(
            $row['title'],
            $row['driving_question'],
            $row['description'] ?? null,
            $row['teacher_id'] ? (int) $row['teacher_id'] : null,
            $row['due_date'] ?? null,
            $classes,
            $id,
            $classId,
            $row['created_at'] ?? null,
            (bool) ($row['requires_reflection'] ?? 0),
            (bool) ($row['requires_milestone_reflection'] ?? 0),
            (bool) ($row['require_critique'] ?? 0),
            $row['deleted_at'] ?? null,
            isset($row['default_tasks']) ? json_decode($row['default_tasks'], true) : null
        );
    }

    private function getClassesForProject(int $projectId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT c.id, c.name 
            FROM classes c
            JOIN project_classes pc ON c.id = pc.class_id
            WHERE pc.project_id = :project_id
        ");
        $stmt->execute([':project_id' => $projectId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function update(int $id, Project $project): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE projects 
            SET title = :title, driving_question = :driving_question, description = :description, due_date = :due_date, requires_reflection = :requires_reflection, requires_milestone_reflection = :requires_milestone_reflection, require_critique = :require_critique, default_tasks = :default_tasks
            WHERE id = :id
        ");

        return $stmt->execute([
            ':id' => $id,
            ':title' => $project->title,
            ':driving_question' => $project->drivingQuestion,
            ':description' => $project->description,
            ':due_date' => $project->dueDate,
            ':requires_reflection' => $project->requiresReflection ? 1 : 0,
            ':requires_milestone_reflection' => $project->requiresMilestoneReflection ? 1 : 0,
            ':require_critique' => $project->requireCritique ? 1 : 0,
            ':default_tasks' => $project->defaultTasks ? json_encode($project->defaultTasks) : null
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE projects SET deleted_at = NOW() WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function restore(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE projects SET deleted_at = NULL WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }
}
