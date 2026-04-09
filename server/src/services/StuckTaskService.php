<?php

namespace App\Services;

use App\Repositories\MySQL\Database;

class StuckTaskService
{
    private \PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function logStuckAction(int $taskId, int $userId, string $reason, string $actionTaken, string $nextActionText, ?string $resolution = null): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO task_stuck_logs (task_id, user_id, reason, action_taken, next_action_text, resolution)
            VALUES (:task_id, :user_id, :reason, :action_taken, :next_action_text, :resolution)
        ");

        $stmt->execute([
            ':task_id' => $taskId,
            ':user_id' => $userId,
            ':reason' => $reason,
            ':action_taken' => $actionTaken,
            ':next_action_text' => $nextActionText,
            ':resolution' => $resolution
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function getLogsForTask(int $taskId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT sl.*, u.name as user_name
            FROM task_stuck_logs sl
            JOIN users u ON sl.user_id = u.id
            WHERE sl.task_id = :task_id
            ORDER BY sl.created_at DESC
        ");

        $stmt->execute([':task_id' => $taskId]);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
