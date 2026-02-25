<?php

namespace App\Domain;

use JsonSerializable;

class PeerReview implements JsonSerializable
{
    public ?int $id;
    public int $reviewerId;
    public int $revieweeId;
    public int $taskId;
    public string $content;
    public int $rating; // 1-5 scale
    public ?string $submittedAt;

    public function __construct(
        int $reviewerId,
        int $revieweeId,
        int $taskId,
        string $content,
        int $rating,
        ?string $submittedAt = null,
        ?int $id = null
    ) {
        $this->reviewerId = $reviewerId;
        $this->revieweeId = $revieweeId;
        $this->taskId = $taskId;
        $this->content = $content;
        $this->rating = $rating;
        $this->submittedAt = $submittedAt;
        $this->id = $id;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'reviewer_id' => $this->reviewerId,
            'reviewee_id' => $this->revieweeId,
            'task_id' => $this->taskId,
            'content' => $this->content,
            'rating' => $this->rating,
            'submitted_at' => $this->submittedAt
        ];
    }
}
