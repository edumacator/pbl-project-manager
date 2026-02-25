<?php

namespace App\Repositories;

use App\Domain\PeerReview;

interface PeerReviewRepositoryInterface
{
    public function create(PeerReview $review): int;
    public function findByTaskId(int $taskId): array;
    public function findByRevieweeId(int $revieweeId): array;
}
