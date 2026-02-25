<?php

namespace App\Domain;

class TaskReflection implements \JsonSerializable
{
    public int $id;
    public int $taskId;
    public int $userId;
    public string $content;
    public ?string $createdAt;
    public ?string $userName;

    public function __construct(
        int $taskId,
        int $userId,
        string $content,
        ?int $id = null,
        ?string $createdAt = null,
        ?string $userName = null
    ) {
        $this->taskId = $taskId;
        $this->userId = $userId;
        $this->content = $content;
        $this->id = $id ?? 0;
        $this->createdAt = $createdAt;
        $this->userName = $userName;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->taskId,
            'user_id' => $this->userId,
            'content' => $this->content,
            'created_at' => $this->createdAt,
            'user_name' => $this->userName
        ];
    }
}
