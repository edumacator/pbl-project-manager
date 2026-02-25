<?php

namespace App\Domain;

use JsonSerializable;

class FeedbackEntry implements JsonSerializable
{
    public ?int $id;
    public int $taskId;
    public int $authorId;
    public string $warmFeedback;
    public string $coolFeedback;
    public bool $requiresRevision;
    public bool $checklistConfirmed;
    public ?string $createdAt;

    public function __construct(
        int $taskId,
        int $authorId,
        string $warmFeedback,
        string $coolFeedback,
        bool $requiresRevision = false,
        bool $checklistConfirmed = false,
        ?int $id = null,
        ?string $createdAt = null
    ) {
        $this->taskId = $taskId;
        $this->authorId = $authorId;
        $this->warmFeedback = $warmFeedback;
        $this->coolFeedback = $coolFeedback;
        $this->requiresRevision = $requiresRevision;
        $this->checklistConfirmed = $checklistConfirmed;
        $this->id = $id;
        $this->createdAt = $createdAt;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'task_id' => $this->taskId,
            'author_id' => $this->authorId,
            'warm_feedback' => $this->warmFeedback,
            'cool_feedback' => $this->coolFeedback,
            'requires_revision' => $this->requiresRevision,
            'checklist_confirmed' => $this->checklistConfirmed,
            'created_at' => $this->createdAt
        ];
    }
}
