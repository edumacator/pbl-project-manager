<?php

namespace App\Repositories\MySQL;

use App\Domain\Checkpoint;
use App\Repositories\CheckpointRepositoryInterface;
use PDO;

class CheckpointRepository implements CheckpointRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(Checkpoint $checkpoint): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO checkpoints (project_id, class_id, title, description, due_date, is_hard_deadline)
            VALUES (:project_id, :class_id, :title, :description, :due_date, :is_hard_deadline)
        ");

        $stmt->execute([
            ':project_id' => $checkpoint->projectId,
            ':class_id' => $checkpoint->classId,
            ':title' => $checkpoint->title,
            ':description' => $checkpoint->description,
            ':due_date' => $checkpoint->dueDate,
            ':is_hard_deadline' => (int) $checkpoint->isHardDeadline
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(Checkpoint $checkpoint): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE checkpoints 
            SET title = :title, 
                description = :description, 
                due_date = :due_date, 
                is_hard_deadline = :is_hard_deadline
            WHERE id = :id AND project_id = :project_id
        ");

        return $stmt->execute([
            ':id' => $checkpoint->id,
            ':project_id' => $checkpoint->projectId,
            ':title' => $checkpoint->title,
            ':description' => $checkpoint->description,
            ':due_date' => $checkpoint->dueDate,
            ':is_hard_deadline' => (int) $checkpoint->isHardDeadline
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM checkpoints WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function findByProjectId(int $projectId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM checkpoints WHERE project_id = :project_id ORDER BY due_date ASC");
        $stmt->execute([':project_id' => $projectId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToCheckpoint'], $rows);
    }

    public function findByClassId(int $classId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM checkpoints WHERE class_id = :class_id ORDER BY due_date ASC");
        $stmt->execute([':class_id' => $classId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToCheckpoint'], $rows);
    }

    public function findById(int $id): ?Checkpoint
    {
        $stmt = $this->pdo->prepare("SELECT * FROM checkpoints WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->mapRowToCheckpoint($row) : null;
    }

    private function mapRowToCheckpoint(array $row): Checkpoint
    {
        return new Checkpoint(
            (int) $row['project_id'],
            $row['title'],
            $row['due_date'],
            (int) $row['id'],
            (bool) ($row['is_hard_deadline'] ?? false),
            (int) ($row['class_id'] ?? null),
            $row['description'] ?? null
        );
    }
}
