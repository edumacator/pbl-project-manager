<?php

namespace App\Domain;

use JsonSerializable;

class AuditLog implements JsonSerializable
{
    public ?int $id;
    public int $userId;
    public ?string $userName = null;
    public string $action;
    public ?string $details; // JSON string
    public ?string $createdAt;

    public function __construct(
        int $userId,
        string $action,
        ?string $details = null,
        ?string $createdAt = null,
        ?int $id = null
    ) {
        $this->userId = $userId;
        $this->action = $action;
        $this->details = $details;
        $this->createdAt = $createdAt;
        $this->id = $id;
    }

    public function jsonSerialize(): mixed
    {
        $data = [
            'id' => $this->id,
            'user_id' => $this->userId,
            'action' => $this->action,
            'details' => $this->details ? json_decode($this->details) : null,
            'created_at' => $this->createdAt
        ];

        if ($this->userName !== null) {
            $data['user_name'] = $this->userName;
        }

        return $data;
    }
}
