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
    public bool $isStuck = false; // New
    public ?int $assigneeId;
    public ?int $teamId;
    public ?string $dueDate;
    public ?string $dependencies; // JSON string
    public ?string $startDate;
    public ?int $durationDays;
    public int $sortOrder = 0; // New
    public ?string $deletedAt; // New
    public bool $isBlocked = false; // Virtual
    public bool $isCompletable = true; // Virtual, default true
    public ?string $assigneeName;
    public ?string $teamName;
    public string $priority;
    public ?string $updatedAt; // Restored
    public ?string $createdAt; // New
    public ?int $parentId; // parent_task_id
    public ?array $subtasks = null;
    public ?int $subtaskCount = null;
    public ?int $completedSubtaskCount = null;
    public ?array $checklist = null; // New
    public ?array $checklistSummary = null; // New

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
        bool $isStuck = false, // New
        string $priority = 'P3',
        ?string $updatedAt = null,
        ?string $assigneeName = null,
        ?string $teamName = null,
        ?string $createdAt = null,
        ?string $deletedAt = null, // New
        int $sortOrder = 0, // New
        ?int $parentId = null
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
        $this->isStuck = $isStuck;
        $this->priority = $priority;
        $this->updatedAt = $updatedAt;
        $this->assigneeName = $assigneeName;
        $this->teamName = $teamName;
        $this->createdAt = $createdAt;
        $this->deletedAt = $deletedAt;
        $this->sortOrder = $sortOrder;
        $this->parentId = $parentId;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'is_stuck' => $this->isStuck,
            'assignee_id' => $this->assigneeId,
            'assignee_name' => $this->assigneeName,
            'team_id' => $this->teamId,
            'team_name' => $this->teamName,
            'due_date' => $this->dueDate,
            'dependencies' => $this->dependencies ? json_decode($this->dependencies) : [],
            'is_blocked' => $this->isBlocked,
            'is_completable' => $this->isCompletable,
            'start_date' => $this->startDate,
            'duration_days' => $this->durationDays,
            'priority' => $this->priority,
            'updated_at' => $this->updatedAt,
            'created_at' => $this->createdAt,
            'deleted_at' => $this->deletedAt,
            'sort_order' => $this->sortOrder,
            'parent_task_id' => $this->parentId,
            'subtasks' => $this->subtasks,
            'subtask_count' => $this->subtaskCount,
            'completed_subtask_count' => $this->completedSubtaskCount,
            'checklist' => $this->checklist,
            'checklist_summary' => $this->checklistSummary
        ];
    }
}
