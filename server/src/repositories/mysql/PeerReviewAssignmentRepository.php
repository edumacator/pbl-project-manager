<?php

namespace App\Repositories\MySQL;

use App\Domain\PeerReviewAssignment;
use PDO;

class PeerReviewAssignmentRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(PeerReviewAssignment $assignment): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO peer_review_assignments (project_id, reviewer_id, reviewee_id, task_id, status, deadline)
            VALUES (:project_id, :reviewer_id, :reviewee_id, :task_id, :status, :deadline)
        ");

        $stmt->execute([
            ':project_id' => $assignment->projectId,
            ':reviewer_id' => $assignment->reviewerId,
            ':reviewee_id' => $assignment->revieweeId,
            ':task_id' => $assignment->taskId,
            ':status' => $assignment->status,
            ':deadline' => $assignment->deadline
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByProjectId(int $projectId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT pra.*, 
                   u1.name as reviewer_name, 
                   u2.name as reviewee_name,
                   t.title as task_title
            FROM peer_review_assignments pra
            JOIN users u1 ON pra.reviewer_id = u1.id
            JOIN users u2 ON pra.reviewee_id = u2.id
            LEFT JOIN tasks t ON pra.task_id = t.id
            WHERE pra.project_id = :project_id
            ORDER BY pra.created_at DESC
        ");
        $stmt->execute([':project_id' => $projectId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToAssignment'], $rows);
    }

    public function findByReviewerId(int $reviewerId, ?int $projectId = null): array
    {
        $sql = "
            SELECT pra.*, 
                   u1.name as reviewer_name, 
                   u2.name as reviewee_name,
                   t.title as task_title
            FROM peer_review_assignments pra
            JOIN users u1 ON pra.reviewer_id = u1.id
            JOIN users u2 ON pra.reviewee_id = u2.id
            LEFT JOIN tasks t ON pra.task_id = t.id
            WHERE pra.reviewer_id = :reviewer_id
        ";
        $params = [':reviewer_id' => $reviewerId];

        if ($projectId) {
            $sql .= " AND pra.project_id = :project_id";
            $params[':project_id'] = $projectId;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return array_map([$this, 'mapRowToAssignment'], $stmt->fetchAll());
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM peer_review_assignments WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    private function mapRowToAssignment(array $row): PeerReviewAssignment
    {
        $assignment = new PeerReviewAssignment(
            (int) $row['project_id'],
            (int) $row['reviewer_id'],
            (int) $row['reviewee_id'],
            $row['task_id'] ? (int) $row['task_id'] : null,
            $row['status'],
            $row['deadline'],
            $row['created_at'],
            (int) $row['id']
        );

        $assignment->reviewerName = $row['reviewer_name'] ?? null;
        $assignment->revieweeName = $row['reviewee_name'] ?? null;
        $assignment->taskTitle = $row['task_title'] ?? null;

        return $assignment;
    }
    public function findById(int $id): ?PeerReviewAssignment
    {
        $stmt = $this->pdo->prepare("
            SELECT pra.*, 
                   u1.name as reviewer_name, 
                   u2.name as reviewee_name,
                   t.title as task_title
            FROM peer_review_assignments pra
            JOIN users u1 ON pra.reviewer_id = u1.id
            JOIN users u2 ON pra.reviewee_id = u2.id
            LEFT JOIN tasks t ON pra.task_id = t.id
            WHERE pra.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->mapRowToAssignment($row) : null;
    }
}
