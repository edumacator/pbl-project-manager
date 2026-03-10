<?php

namespace App\Domain;

use JsonSerializable;

class TaskChecklistItem implements JsonSerializable
{
    public ?int $id;
    public int $taskId;
    public string $content;
    public bool $isCompleted;
    public int $sortOrder;
    public ?string $createdAt;
    public ?string $updatedAt;

    public function __construct(
        int $taskId,
        string $content,
        bool $isCompleted = false,
        int $sortOrder = 0,
        ?int $id = null,
        ?string $createdAt = null,
        ?string $updatedAt = null
    ) {
        $this->taskId = $taskId;
        $this->content = $content;
        $this->isCompleted = $isCompleted;
        $this->sortOrder = $sortOrder;
        $this->id = $id;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'task_id' => $this->taskId,
            'content' => $this->content,
            'is_completed' => (bool) $this->isCompleted,
            'sort_order' => $this->sortOrder,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt
        ];
    }
}
