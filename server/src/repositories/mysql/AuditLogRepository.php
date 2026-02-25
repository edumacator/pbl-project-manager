<?php

namespace App\Repositories\MySQL;

use App\Domain\AuditLog;
use App\Repositories\AuditLogRepositoryInterface;
use PDO;

class AuditLogRepository implements AuditLogRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function log(AuditLog $log): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO audit_logs (user_id, action, details)
            VALUES (:user_id, :action, :details)
        ");

        $stmt->execute([
            ':user_id' => $log->userId,
            ':action' => $log->action,
            ':details' => $log->details
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByUserId(int $userId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM audit_logs WHERE user_id = :user_id ORDER BY created_at DESC");
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToLog'], $rows);
    }

    private function mapRowToLog(array $row): AuditLog
    {
        return new AuditLog(
            (int) $row['user_id'],
            $row['action'],
            $row['details'] ?? null,
            $row['created_at'],
            (int) $row['id']
        );
    }
}
