<?php

namespace App\Services;

use App\Repositories\TaskRepositoryInterface;
use App\Repositories\AuditLogRepositoryInterface;
use App\Domain\Task;
use App\Domain\AuditLog;

class TaskService
{
    private TaskRepositoryInterface $taskRepo;
    private AuditLogRepositoryInterface $auditRepo;
    private ReviewService $reviewService;
    private \App\Repositories\MySQL\TaskReflectionRepository $reflectionRepo;
    private \App\Repositories\MySQL\ProjectResourceRepository $resourceRepo;
    private \App\Repositories\TaskChecklistItemRepositoryInterface $checklistRepo;
    private \App\Repositories\UserRepositoryInterface $userRepo;

    public function __construct(
        TaskRepositoryInterface $taskRepo,
        AuditLogRepositoryInterface $auditRepo,
        ReviewService $reviewService,
        \App\Repositories\MySQL\TaskReflectionRepository $reflectionRepo,
        \App\Repositories\MySQL\ProjectResourceRepository $resourceRepo,
        \App\Repositories\TaskChecklistItemRepositoryInterface $checklistRepo,
        \App\Repositories\UserRepositoryInterface $userRepo
    ) {
        $this->taskRepo = $taskRepo;
        $this->auditRepo = $auditRepo;
        $this->reviewService = $reviewService;
        $this->reflectionRepo = $reflectionRepo;
        $this->resourceRepo = $resourceRepo;
        $this->checklistRepo = $checklistRepo;
        $this->userRepo = $userRepo;
    }

    public function addReflection(int $taskId, int $userId, string $content, string $transitionType = 'start_work'): \App\Domain\TaskReflection
    {
        $reflection = new \App\Domain\TaskReflection($taskId, $userId, $content, $transitionType);
        $id = $this->reflectionRepo->create($reflection);
        $reflection->id = $id;

        // Audit log
        $log = new AuditLog($userId, 'ADD_REFLECTION', json_encode(['task_id' => $taskId, 'reflection_id' => $id]));
        $this->auditRepo->log($log);

        return $reflection;
    }

    public function getReflections(int $taskId): array
    {
        return $this->reflectionRepo->findByTaskId($taskId);
    }
    public function addResource(int $projectId, ?int $taskId, string $title, string $url, string $type = 'link', ?int $teamId = null, ?string $description = null, ?int $userId = null): \App\Domain\ProjectResource
    {
        $resource = new \App\Domain\ProjectResource($projectId, $title, $url, $type, $taskId, $teamId, null, null, $description, $userId);
        $id = $this->resourceRepo->create($resource);
        $resource->id = $id;
        return $resource;
    }

    public function updateResource(int $resourceId, array $data): ?\App\Domain\ProjectResource
    {
        $resource = $this->resourceRepo->findById($resourceId);
        if (!$resource)
            return null;

        if (isset($data['title']))
            $resource->title = $data['title'];
        if (isset($data['url']))
            $resource->url = $data['url'];
        if (isset($data['type']))
            $resource->type = $data['type'];
        if (isset($data['description']))
            $resource->description = $data['description'];
        if (array_key_exists('team_id', $data))
            $resource->teamId = $data['team_id'];
        if (array_key_exists('task_id', $data))
            $resource->taskId = $data['task_id'];

        $this->resourceRepo->update($resource);
        return $resource;
    }

    public function deleteResource(int $resourceId): bool
    {
        return $this->resourceRepo->delete($resourceId);
    }

    public function getResourcesForTeam(int $teamId): array
    {
        return $this->resourceRepo->findByTeamId($teamId);
    }

    public function getResourcesForTask(int $taskId): array
    {
        return $this->resourceRepo->findByTaskId($taskId);
    }

    public function getResourcesForProject(int $projectId): array
    {
        return $this->resourceRepo->findByProjectId($projectId);
    }

    public function getChecklistItems(int $taskId): array
    {
        return $this->checklistRepo->findByTaskId($taskId);
    }

    public function addChecklistItem(int $taskId, string $content, int $userId): \App\Domain\TaskChecklistItem
    {
        $task = $this->taskRepo->findById($taskId);
        $user = $this->userRepo->findById($userId);
        if (!$task || !$user) {
            throw new \Exception("Task or User not found");
        }

        $isOwner = $task->assigneeId === $userId;
        $isTeacher = $user->role === 'teacher';

        if (!$isOwner && !$isTeacher) {
            throw new \Exception("Only the task owner or a teacher can add checklist items");
        }

        $item = new \App\Domain\TaskChecklistItem($taskId, $content);
        $id = $this->checklistRepo->create($item);
        $item->id = $id;
        return $item;
    }

    public function updateChecklistItem(int $itemId, array $data, int $userId): ?\App\Domain\TaskChecklistItem
    {
        $item = $this->checklistRepo->findById($itemId);
        if (!$item)
            return null;

        $task = $this->taskRepo->findById($item->taskId);
        $user = $this->userRepo->findById($userId);

        if (!$task || !$user) {
            throw new \Exception("Task or User not found");
        }

        $isOwner = $task->assigneeId === $userId;
        $isTeacher = $user->role === 'teacher';

        if (!$isOwner && !$isTeacher) {
            throw new \Exception("Only the task owner or a teacher can update checklist items");
        }

        if (isset($data['content']))
            $item->content = $data['content'];
        if (isset($data['is_completed']))
            $item->isCompleted = (bool) $data['is_completed'];
        if (isset($data['sort_order']))
            $item->sortOrder = (int) $data['sort_order'];

        $this->checklistRepo->update($item);
        return $item;
    }

    public function deleteChecklistItem(int $itemId, int $userId): bool
    {
        $item = $this->checklistRepo->findById($itemId);
        if (!$item)
            return false;

        $task = $this->taskRepo->findById($item->taskId);
        $user = $this->userRepo->findById($userId);

        if (!$task || !$user) {
            throw new \Exception("Task or User not found");
        }

        $isOwner = $task->assigneeId === $userId;
        $isTeacher = $user->role === 'teacher';

        if (!$isOwner && !$isTeacher) {
            throw new \Exception("Only the task owner or a teacher can delete checklist items");
        }

        return $this->checklistRepo->delete($itemId);
    }

    public function createTask(array $data, int $userId): Task
    {
        $startDate = $data['start_date'] ?? date('Y-m-d');
        $dueDate = $data['due_date'] ?? null;
        $duration = isset($data['duration_days']) ? (int) $data['duration_days'] : null;

        // If dependencies exist, start date should be the max due date of dependencies
        $dependencies = $data['dependencies'] ?? [];
        if (!empty($dependencies)) {
            $maxDueDate = null;
            foreach ($dependencies as $depId) {
                $depTask = $this->taskRepo->findById((int) $depId);
                if ($depTask && $depTask->dueDate) {
                    if (!$maxDueDate || $depTask->dueDate > $maxDueDate) {
                        $maxDueDate = $depTask->dueDate;
                    }
                }
            }
            if ($maxDueDate) {
                // Ensure dependent tasks start the day AFTER the max dependency due date
                $maxDT = new \DateTime($maxDueDate);
                $maxDT->modify('+1 day');
                $minStartStr = $maxDT->format('Y-m-d');

                // Shift the start date, and shift the due date by difference
                if ($startDate < $minStartStr) {
                    if ($dueDate && $startDate) {
                        $oldStart = new \DateTime($startDate);
                        $newStart = new \DateTime($minStartStr);
                        $diff = $oldStart->diff($newStart);
                        $e = new \DateTime($dueDate);
                        $e->add($diff);
                        $dueDate = $e->format('Y-m-d');
                    }
                    $startDate = $minStartStr;
                }
            }
        }

        if ($startDate && $dueDate && $duration === null) {
            $s = new \DateTime($startDate);
            $e = new \DateTime($dueDate);
            // Ignore time
            $s->setTime(0, 0, 0);
            $e->setTime(0, 0, 0);
            $diffDays = $s->diff($e)->days;
            $duration = max(1, $diffDays + 1);
        }

        if (!$dueDate && $startDate && $duration !== null) {
            $daysToAdd = max(0, $duration - 1);
            $dueDate = date('Y-m-d', strtotime($startDate . " + $daysToAdd days"));
        }

        if ($duration === null) {
            $duration = 1;
        }

        $task = new Task(
            (int) $data['project_id'],
            $data['title'],
            $data['description'] ?? null,
            'todo',
            isset($data['assignee_id']) ? (int) $data['assignee_id'] : null,
            isset($data['team_id']) ? (int) $data['team_id'] : null,
            null, // id
            $dueDate,
            $dependencies,
            $startDate,
            $duration,
            false, // isStuck
            $data['priority'] ?? 'medium', // priority
            null, // updatedAt
            null, // assigneeName
            null, // createdAt
            null, // deletedAt
            0 // sortOrder
        );

        $id = $this->taskRepo->create($task);
        $task->id = $id;

        // Audit Log
        if ($this->auditRepo) {
            $log = new AuditLog($userId, 'CREATE_TASK', json_encode(['task_id' => $id]));
            $this->auditRepo->log($log);
        }

        return $task;
    }

    public function updateTask(int $taskId, array $data, int $userId): ?Task
    {
        $task = $this->taskRepo->findById($taskId);
        if (!$task)
            return null;

        $oldStatus = $task->status;
        $oldIsStuck = $task->isStuck;
        $oldAssigneeId = $task->assigneeId;

        if (isset($data['title']))
            $task->title = $data['title'];
        if (isset($data['description']))
            $task->description = $data['description'];
        if (isset($data['status']))
            $task->status = $data['status'];
        if (array_key_exists('assignee_id', $data))
            $task->assigneeId = $data['assignee_id'];
        if (array_key_exists('team_id', $data))
            $task->teamId = $data['team_id'];
        if (array_key_exists('due_date', $data))
            $task->dueDate = $data['due_date'];
        if (array_key_exists('is_stuck', $data))
            $task->isStuck = (bool) $data['is_stuck'];
        if (isset($data['priority']))
            $task->priority = $data['priority'];
        if (isset($data['start_date']))
            $task->startDate = $data['start_date'];
        if (isset($data['duration_days']))
            $task->durationDays = (int) $data['duration_days'];
        if (isset($data['sort_order']))
            $task->sortOrder = (int) $data['sort_order'];

        // Recompute duration based on dates if not explicitly provided
        if (!isset($data['duration_days']) && $task->startDate && $task->dueDate) {
            $s = new \DateTime($task->startDate);
            $e = new \DateTime($task->dueDate);
            $s->setTime(0, 0, 0);
            $e->setTime(0, 0, 0);
            $task->durationDays = max(1, $s->diff($e)->days + 1);
        }

        if (isset($data['dependencies'])) {
            $task->dependencies = json_encode($data['dependencies']);

            // Recalculate start date if dependencies changed
            $maxDueDate = null;
            foreach ($data['dependencies'] as $depId) {
                $depTask = $this->taskRepo->findById((int) $depId);
                if ($depTask && $depTask->dueDate) {
                    if (!$maxDueDate || $depTask->dueDate > $maxDueDate) {
                        $maxDueDate = $depTask->dueDate;
                    }
                }
            }
            if ($maxDueDate) {
                // Ensure dependent tasks start the day AFTER the max dependency due date
                $maxDT = new \DateTime($maxDueDate);
                $maxDT->modify('+1 day');
                $minStartStr = $maxDT->format('Y-m-d');

                // If user selected date is before the allowed start date, force shift it!
                if ($task->startDate < $minStartStr) {
                    $task->startDate = $minStartStr;
                    // If we update start date, recalculate due date based on actual duration properly
                    if ($task->durationDays) {
                        $daysToAdd = max(0, $task->durationDays - 1);
                        $task->dueDate = date('Y-m-d', strtotime($task->startDate . " + {$daysToAdd} days"));
                    }
                }
            }
        }

        $this->taskRepo->update($task);

        if ($this->auditRepo) {
            if ($oldStatus !== $task->status) {
                $log = new \App\Domain\AuditLog($userId, 'UPDATE_TASK_STATUS', json_encode([
                    'task_id' => $taskId,
                    'old_status' => $oldStatus,
                    'new_status' => $task->status
                ]));
                $this->auditRepo->log($log);
            }

            if ($oldIsStuck !== $task->isStuck) {
                $action = $task->isStuck ? 'MARKED_STUCK' : 'UNMARKED_STUCK';
                $log = new \App\Domain\AuditLog($userId, $action, json_encode([
                    'task_id' => $taskId
                ]));
                $this->auditRepo->log($log);
            }

            if ($oldAssigneeId !== $task->assigneeId) {
                $action = $task->assigneeId ? 'ASSIGNED_TASK' : 'UNASSIGNED_TASK';
                $log = new \App\Domain\AuditLog($userId, $action, json_encode([
                    'task_id' => $taskId,
                    'old_assignee_id' => $oldAssigneeId,
                    'new_assignee_id' => $task->assigneeId
                ]));
                $this->auditRepo->log($log);
            }
        }

        return $task;
    }

    public function getTasksByProject(int $projectId, ?int $teamId = null, bool $includeDeleted = false): array
    {
        $tasks = $this->taskRepo->findByProjectId($projectId, $teamId, $includeDeleted);

        // Enrich with isCompletable status
        foreach ($tasks as $task) {
            $task->isCompletable = $this->reviewService->isTaskCompletable($task->id);
            // Optionally include checklist summary for board view
            $items = $this->checklistRepo->findByTaskId($task->id);
            if (!empty($items)) {
                $completed = count(array_filter($items, fn($i) => $i->isCompleted));
                $task->checklistSummary = [
                    'total' => count($items),
                    'completed' => $completed
                ];
            }
        }

        return $tasks;
    }

    public function getTask(int $taskId): ?Task
    {
        $task = $this->taskRepo->findById($taskId);
        if ($task) {
            $task->isCompletable = $this->reviewService->isTaskCompletable($task->id);
            $task->checklist = $this->checklistRepo->findByTaskId($taskId);
        }
        return $task;
    }

    public function deleteTask(int $taskId): bool
    {
        return $this->taskRepo->delete($taskId);
    }

    public function restoreTask(int $taskId): bool
    {
        return $this->taskRepo->restore($taskId);
    }
}
