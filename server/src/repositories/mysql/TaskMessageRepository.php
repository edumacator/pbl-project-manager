<?php

namespace App\Repositories\MySQL;

use App\Domain\TaskMessage;
use PDO;

class TaskMessageRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(TaskMessage $message): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO task_messages (task_id, user_id, message, visibility, is_system)
            VALUES (:task_id, :user_id, :message, :visibility, :is_system)
        ");

        $stmt->execute([
            ':task_id' => $message->taskId,
            ':user_id' => $message->userId,
            ':message' => $message->message,
            ':visibility' => $message->visibility,
            ':is_system' => $message->isSystem ? 1 : 0
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByTaskId(int $taskId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT tm.*, u.name as user_name
            FROM task_messages tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.task_id = :task_id
            ORDER BY tm.created_at ASC
        ");
        $stmt->execute([':task_id' => $taskId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $messages = [];
        foreach ($rows as $row) {
            $messages[] = new TaskMessage(
                (int) $row['task_id'],
                (int) $row['user_id'],
                $row['message'],
                $row['visibility'] ?? 'team',
                (bool) $row['is_system'],
                (int) $row['id'],
                $row['created_at'],
                $row['user_name']
            );
        }

        return $messages;
    }
}
