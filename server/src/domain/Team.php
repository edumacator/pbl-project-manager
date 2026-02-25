<?php

namespace App\Domain;

use JsonSerializable;

class Team implements JsonSerializable
{
    public ?int $id;
    public int $projectId;
    public int $classId;
    public string $name;
    public ?string $className; // Nullable for now, populated by Repo
    public array $members; // Array of Users

    public function __construct(
        int $projectId,
        int $classId,
        string $name,
        ?int $id = null,
        ?string $className = null,
        array $members = []
    ) {
        $this->projectId = $projectId;
        $this->classId = $classId;
        $this->name = $name;
        $this->id = $id;
        $this->className = $className;
        $this->members = $members;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'class_id' => $this->classId,
            'name' => $this->name,
            'class_name' => $this->className,
            'members' => $this->members
        ];
    }
}
