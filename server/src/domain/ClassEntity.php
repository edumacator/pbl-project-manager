<?php

namespace App\Domain;

class ClassEntity implements \JsonSerializable
{
    public ?int $id;
    public string $name;
    public int $teacherId;
    public ?string $createdAt;
    public ?string $deletedAt;

    public function __construct(string $name, int $teacherId, ?int $id = null, ?string $createdAt = null, ?string $deletedAt = null)
    {
        $this->name = $name;
        $this->teacherId = $teacherId;
        $this->id = $id;
        $this->createdAt = $createdAt;
        $this->deletedAt = $deletedAt;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'teacher_id' => $this->teacherId,
            'created_at' => $this->createdAt,
            'deleted_at' => $this->deletedAt
        ];
    }
}
