<?php

namespace App\Domain;

use JsonSerializable;

class PeerReviewAssignment implements JsonSerializable
{
    public ?int $id;
    public int $projectId;
    public int $reviewerId;
    public int $revieweeId;
    public ?int $taskId;
    public string $status;
    public ?string $deadline;
    public ?string $createdAt;

    // Expanded properties
    public ?string $reviewerName;
    public ?string $revieweeName;
    public ?string $taskTitle;

    public function __construct(
        int $projectId,
        int $reviewerId,
        int $revieweeId,
        ?int $taskId = null,
        string $status = 'pending',
        ?string $deadline = null,
        ?string $createdAt = null,
        ?int $id = null
    ) {
        $this->projectId = $projectId;
        $this->reviewerId = $reviewerId;
        $this->revieweeId = $revieweeId;
        $this->taskId = $taskId;
        $this->status = $status;
        $this->deadline = $deadline;
        $this->createdAt = $createdAt;
        $this->id = $id;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'reviewer_id' => $this->reviewerId,
            'reviewee_id' => $this->revieweeId,
            'task_id' => $this->taskId,
            'status' => $this->status,
            'deadline' => $this->deadline,
            'created_at' => $this->createdAt,
            'reviewer_name' => $this->reviewerName ?? null,
            'reviewee_name' => $this->revieweeName ?? null,
            'task_title' => $this->taskTitle ?? null
        ];
    }
}
