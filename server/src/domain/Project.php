<?php

namespace App\Domain;

use JsonSerializable;

class Project implements JsonSerializable
{
    public ?int $id;
    public string $title;
    public string $drivingQuestion;
    public ?string $description;
    public ?int $teacherId;
    public ?string $dueDate; // Format YYYY-MM-DD
    public array $classes;
    public ?int $classId; // Contextual class ID
    public ?string $createdAt;
    public bool $requiresReflection;
    public bool $requiresMilestoneReflection;
    public bool $requireCritique;
    public ?string $deletedAt;
    public ?array $defaultTasks;

    public function __construct(
        string $title,
        string $drivingQuestion,
        ?string $description = null,
        ?int $teacherId = null,
        ?string $dueDate = null,
        array $classes = [],
        ?int $id = null,
        ?int $classId = null,
        ?string $createdAt = null,
        bool $requiresReflection = false,
        bool $requiresMilestoneReflection = false,
        bool $requireCritique = false,
        ?string $deletedAt = null,
        ?array $defaultTasks = null
    ) {
        $this->title = $title;
        $this->drivingQuestion = $drivingQuestion;
        $this->description = $description;
        $this->teacherId = $teacherId;
        $this->dueDate = $dueDate;
        $this->classes = $classes;
        $this->id = $id;
        $this->classId = $classId;
        $this->createdAt = $createdAt;
        $this->requiresReflection = $requiresReflection;
        $this->requiresMilestoneReflection = $requiresMilestoneReflection;
        $this->requireCritique = $requireCritique;
        $this->deletedAt = $deletedAt;
        $this->defaultTasks = $defaultTasks;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'driving_question' => $this->drivingQuestion,
            'description' => $this->description,
            'teacher_id' => $this->teacherId,
            'due_date' => $this->dueDate,
            'classes' => $this->classes,
            'class_id' => $this->classId,
            'created_at' => $this->createdAt,
            'requires_reflection' => $this->requiresReflection,
            'requires_milestone_reflection' => $this->requiresMilestoneReflection,
            'require_critique' => $this->requireCritique,
            'deleted_at' => $this->deletedAt,
            'default_tasks' => $this->defaultTasks
        ];
    }
}
