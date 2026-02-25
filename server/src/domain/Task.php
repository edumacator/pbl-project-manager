<?php

namespace App\Domain;

use JsonSerializable;

class Task implements JsonSerializable
{
    public ?int $id;
    public int $projectId;
    public string $title;
    public ?string $description;
    public string $status; // 'todo', 'doing', 'done'
    public ?int $assigneeId;
    public ?int $teamId;
    public ?string $dueDate;
    public ?string $dependencies; // JSON string
    public ?string $startDate;
    public ?string $endDate; // New
    public ?int $durationDays;
    public ?string $deletedAt; // New
    public bool $isBlocked = false; // Virtual
    public bool $isCompletable = true; // Virtual, default true
    public ?string $assigneeName;
    public string $priority;
    public ?string $updatedAt; // Restored
    public ?string $createdAt; // New

    public function __construct(
        int $projectId,
        string $title,
        ?string $description = null,
        string $status = 'todo',
        ?int $assigneeId = null,
        ?int $teamId = null,
        ?int $id = null,
        ?string $dueDate = null,
        $dependencies = null, // Can be array or JSON string
        ?string $startDate = null,
        ?int $durationDays = 1,
        string $priority = 'medium',
        ?string $updatedAt = null,
        ?string $assigneeName = null,
        ?string $createdAt = null,
        ?string $endDate = null, // New
        ?string $deletedAt = null // New
    ) {
        $this->projectId = $projectId;
        $this->title = $title;
        $this->description = $description;
        $this->status = $status;
        $this->assigneeId = $assigneeId;
        $this->teamId = $teamId;
        $this->id = $id;
        $this->dueDate = $dueDate;

        if (is_array($dependencies)) {
            $this->dependencies = json_encode($dependencies);
        } elseif (is_string($dependencies)) {
            $this->dependencies = $dependencies;
        } else {
            $this->dependencies = null;
        }

        $this->startDate = $startDate;
        $this->durationDays = $durationDays;
        $this->priority = $priority;
        $this->updatedAt = $updatedAt;
        $this->assigneeName = $assigneeName;
        $this->createdAt = $createdAt;
        $this->endDate = $endDate;
        $this->deletedAt = $deletedAt;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'assignee_id' => $this->assigneeId,
            'assignee_name' => $this->assigneeName,
            'team_id' => $this->teamId,
            'due_date' => $this->dueDate,
            'dependencies' => $this->dependencies ? json_decode($this->dependencies) : [],
            'is_blocked' => $this->isBlocked,
            'is_completable' => $this->isCompletable,
            'start_date' => $this->startDate,
            'end_date' => $this->endDate,
            'duration_days' => $this->durationDays,
            'priority' => $this->priority,
            'updated_at' => $this->updatedAt,
            'created_at' => $this->createdAt,
            'deleted_at' => $this->deletedAt
        ];
    }
}
