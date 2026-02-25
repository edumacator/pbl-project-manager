<?php

namespace App\Repositories\MySQL;

use App\Domain\Reflection;
use App\Repositories\ReflectionRepositoryInterface;
use PDO;

class ReflectionRepository implements ReflectionRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(Reflection $reflection): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO reflections (user_id, checkpoint_id, type, content)
            VALUES (:user_id, :checkpoint_id, :type, :content)
        ");

        $stmt->execute([
            ':user_id' => $reflection->userId,
            ':checkpoint_id' => $reflection->checkpointId,
            ':type' => $reflection->type,
            ':content' => $reflection->content
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByCheckpointId(int $checkpointId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM reflections WHERE checkpoint_id = :checkpoint_id");
        $stmt->execute([':checkpoint_id' => $checkpointId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToReflection'], $rows);
    }

    public function findByUserId(int $userId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM reflections WHERE user_id = :user_id");
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToReflection'], $rows);
    }

    private function mapRowToReflection(array $row): Reflection
    {
        return new Reflection(
            (int) $row['user_id'],
            (int) $row['checkpoint_id'],
            $row['type'],
            $row['content'],
            $row['submitted_at'] ?? null,
            (int) $row['id']
        );
    }
}
