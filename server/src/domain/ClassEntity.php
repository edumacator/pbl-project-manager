<?php

namespace App\Domain;

class ClassEntity implements \JsonSerializable
{
    public ?int $id;
    public string $name;
    public int $staffId;
    public ?string $joinCode;
    public ?string $createdAt;
    public ?string $deletedAt;

    public function __construct(string $name, int $staffId, ?int $id = null, ?string $createdAt = null, ?string $deletedAt = null, ?string $joinCode = null)
    {
        $this->name = $name;
        $this->staffId = $staffId;
        $this->id = $id;
        $this->createdAt = $createdAt;
        $this->deletedAt = $deletedAt;
        $this->joinCode = $joinCode;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'staff_id' => $this->staffId,
            'join_code' => $this->joinCode,
            'created_at' => $this->createdAt,
            'deleted_at' => $this->deletedAt
        ];
    }
}
