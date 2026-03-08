<?php

namespace App\Domain;

use JsonSerializable;

class TaskMessage implements JsonSerializable
{
    public ?int $id;
    public int $taskId;
    public int $userId;
    public string $message;
    public string $visibility; // 'team' or 'teacher'
    public bool $isSystem;
    public ?string $createdAt;

    // Joined fields from DB
    public ?string $userName;

    public function __construct(
        int $taskId,
        int $userId,
        string $message,
        string $visibility = 'team',
        bool $isSystem = false,
        ?int $id = null,
        ?string $createdAt = null,
        ?string $userName = null
    ) {
        $this->taskId = $taskId;
        $this->userId = $userId;
        $this->message = $message;
        $this->visibility = $visibility;
        $this->isSystem = $isSystem;
        $this->id = $id;
        $this->createdAt = $createdAt;
        $this->userName = $userName;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'task_id' => $this->taskId,
            'user_id' => $this->userId,
            'message' => $this->message,
            'visibility' => $this->visibility,
            'is_system' => $this->isSystem,
            'created_at' => $this->createdAt,
            'user_name' => $this->userName
        ];
    }
}
