<?php

namespace App\Repositories\MySQL;

use App\Domain\PeerReview;
use App\Repositories\PeerReviewRepositoryInterface;
use PDO;

class PeerReviewRepository implements PeerReviewRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(PeerReview $review): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO peer_reviews (reviewer_id, reviewee_id, task_id, content, rating)
            VALUES (:reviewer_id, :reviewee_id, :task_id, :content, :rating)
        ");

        $stmt->execute([
            ':reviewer_id' => $review->reviewerId,
            ':reviewee_id' => $review->revieweeId,
            ':task_id' => $review->taskId,
            ':content' => $review->content,
            ':rating' => $review->rating
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByTaskId(int $taskId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM peer_reviews WHERE task_id = :task_id");
        $stmt->execute([':task_id' => $taskId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToReview'], $rows);
    }

    public function findByRevieweeId(int $revieweeId): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM peer_reviews WHERE reviewee_id = :reviewee_id");
        $stmt->execute([':reviewee_id' => $revieweeId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToReview'], $rows);
    }

    private function mapRowToReview(array $row): PeerReview
    {
        return new PeerReview(
            (int) $row['reviewer_id'],
            (int) $row['reviewee_id'],
            (int) $row['task_id'],
            $row['content'],
            (int) $row['rating'],
            $row['submitted_at'] ?? null,
            (int) $row['id']
        );
    }
}
