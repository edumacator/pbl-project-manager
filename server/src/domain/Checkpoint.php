<?php

namespace App\Domain;

use JsonSerializable;

class Checkpoint implements JsonSerializable
{
    public ?int $id;
    public ?int $projectId;
    public ?int $classId;
    public string $title;
    public ?string $description; // New
    public ?string $dueDate;
    public bool $isHardDeadline;

    public function __construct(
        ?int $projectId,
        string $title,
        ?string $dueDate = null,
        ?int $id = null,
        bool $isHardDeadline = false,
        ?int $classId = null,
        ?string $description = null // New
    ) {
        $this->projectId = $projectId;
        $this->title = $title;
        $this->dueDate = $dueDate;
        $this->id = $id;
        $this->isHardDeadline = $isHardDeadline;
        $this->classId = $classId;
        $this->description = $description;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'class_id' => $this->classId,
            'title' => $this->title,
            'description' => $this->description,
            'due_date' => $this->dueDate,
            'is_hard_deadline' => $this->isHardDeadline
        ];
    }
}
