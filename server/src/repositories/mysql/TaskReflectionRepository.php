<?php

namespace App\Repositories\MySQL;

use App\Domain\TaskReflection;
use PDO;

class TaskReflectionRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(TaskReflection $reflection): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO task_reflections (task_id, user_id, content)
            VALUES (:task_id, :user_id, :content)
        ");

        $stmt->execute([
            ':task_id' => $reflection->taskId,
            ':user_id' => $reflection->userId,
            ':content' => $reflection->content
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByTaskId(int $taskId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT tr.*, u.name as user_name
            FROM task_reflections tr
            JOIN users u ON tr.user_id = u.id
            WHERE tr.task_id = :task_id
            ORDER BY tr.created_at DESC
        ");
        $stmt->execute([':task_id' => $taskId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapRowToReflection'], $rows);
    }

    private function mapRowToReflection(array $row): TaskReflection
    {
        return new TaskReflection(
            (int) $row['task_id'],
            (int) $row['user_id'],
            $row['content'],
            (int) $row['id'],
            $row['created_at'],
            $row['user_name'] ?? null
        );
    }
}
