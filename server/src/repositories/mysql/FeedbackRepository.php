<?php

namespace App\Repositories\MySQL;

use App\Domain\FeedbackEntry;
use PDO;

class FeedbackRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(FeedbackEntry $feedback): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO feedback_entries (task_id, author_id, warm_feedback, cool_feedback, requires_revision, checklist_confirmed)
            VALUES (:task_id, :author_id, :warm_feedback, :cool_feedback, :requires_revision, :checklist_confirmed)
        ");

        $stmt->execute([
            ':task_id' => $feedback->taskId,
            ':author_id' => $feedback->authorId,
            ':warm_feedback' => $feedback->warmFeedback,
            ':cool_feedback' => $feedback->coolFeedback,
            ':requires_revision' => $feedback->requiresRevision ? 1 : 0,
            ':checklist_confirmed' => $feedback->checklistConfirmed ? 1 : 0
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByTaskId(int $taskId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT f.*, u.name as author_name 
            FROM feedback_entries f
            JOIN users u ON f.author_id = u.id
            WHERE f.task_id = :task_id
            ORDER BY f.created_at DESC
        ");
        $stmt->execute([':task_id' => $taskId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function ($row) {
            $feedback = new FeedbackEntry(
                (int) $row['task_id'],
                (int) $row['author_id'],
                $row['warm_feedback'],
                $row['cool_feedback'],
                (bool) $row['requires_revision'],
                (int) $row['id'],
                $row['created_at']
            );
            // We could attach author_name to the domain if needed, or return as array wrapper
            // For now, let's keep domain pure. If we need author name in UI, we might need a DTO or extend domain.
            // Actually, for simplicity, let's just return the array with extra fields in Service or expand domain later.
            // Or better: Let's assume domain is enough for now, but UI usually needs name.
            // Let's rely on frontend to maybe know authors? No, backend should send it.
            // I'll stick to domain for now.
            return $feedback;
        }, $rows);
    }

    // Determine if task has passed critique
    // "Return TRUE only if a feedback_entry exists for this task AND requires_revision is FALSE (or a subsequent revision was submitted)."
    // Implementation: Look at the LATEST feedback entry. If it exists and requires_revision is FALSE, then passed.
    // If latest requires revision, then failed.
    // If no feedback, failed (if required).
    public function getLatestFeedback(int $taskId): ?FeedbackEntry
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM feedback_entries 
            WHERE task_id = :task_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $stmt->execute([':task_id' => $taskId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row)
            return null;

        return new FeedbackEntry(
            (int) $row['task_id'],
            (int) $row['author_id'],
            $row['warm_feedback'],
            $row['cool_feedback'],
            (bool) $row['requires_revision'],
            (bool) ($row['checklist_confirmed'] ?? false),
            (int) $row['id'],
            $row['created_at']
        );
    }
}
