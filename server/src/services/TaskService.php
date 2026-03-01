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

    public function __construct(
        TaskRepositoryInterface $taskRepo,
        AuditLogRepositoryInterface $auditRepo,
        ReviewService $reviewService,
        \App\Repositories\MySQL\TaskReflectionRepository $reflectionRepo,
        \App\Repositories\MySQL\ProjectResourceRepository $resourceRepo
    ) {
        $this->taskRepo = $taskRepo;
        $this->auditRepo = $auditRepo;
        $this->reviewService = $reviewService;
        $this->reflectionRepo = $reflectionRepo;
        $this->resourceRepo = $resourceRepo;
    }

    public function addReflection(int $taskId, int $userId, string $content): \App\Domain\TaskReflection
    {
        $reflection = new \App\Domain\TaskReflection($taskId, $userId, $content);
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
    public function addResource(int $projectId, ?int $taskId, string $title, string $url, string $type = 'link', ?int $teamId = null, ?string $description = null): \App\Domain\ProjectResource
    {
        $resource = new \App\Domain\ProjectResource($projectId, $title, $url, $type, $taskId, $teamId, null, null, $description);
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

    public function createTask(array $data, int $userId): Task
    {
        $startDate = $data['start_date'] ?? date('Y-m-d');
        $endDate = $data['end_date'] ?? $data['due_date'] ?? null;
        $duration = isset($data['duration_days']) ? (int) $data['duration_days'] : null;

        // If dependencies exist, start date should be the max end date of dependencies
        $dependencies = $data['dependencies'] ?? [];
        if (!empty($dependencies)) {
            $maxEndDate = null;
            foreach ($dependencies as $depId) {
                $depTask = $this->taskRepo->findById((int) $depId);
                if ($depTask && $depTask->endDate) {
                    if (!$maxEndDate || $depTask->endDate > $maxEndDate) {
                        $maxEndDate = $depTask->endDate;
                    }
                }
            }
            if ($maxEndDate) {
                // Ensure dependent tasks start the day AFTER the max dependency end date
                $maxDT = new \DateTime($maxEndDate);
                $maxDT->modify('+1 day');
                $minStartStr = $maxDT->format('Y-m-d');

                // Shift the start date, and shift the end date by difference
                if ($startDate < $minStartStr) {
                    if ($endDate && $startDate) {
                        $oldStart = new \DateTime($startDate);
                        $newStart = new \DateTime($minStartStr);
                        $diff = $oldStart->diff($newStart);
                        $e = new \DateTime($endDate);
                        $e->add($diff);
                        $endDate = $e->format('Y-m-d');
                    }
                    $startDate = $minStartStr;
                }
            }
        }

        if ($startDate && $endDate && $duration === null) {
            $s = new \DateTime($startDate);
            $e = new \DateTime($endDate);
            // Ignore time
            $s->setTime(0, 0, 0);
            $e->setTime(0, 0, 0);
            $diffDays = $s->diff($e)->days;
            $duration = max(1, $diffDays + 1);
        }

        if (!$endDate && $startDate && $duration !== null) {
            $daysToAdd = max(0, $duration - 1);
            $endDate = date('Y-m-d', strtotime($startDate . " + $daysToAdd days"));
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
            null,
            $data['due_date'] ?? null,
            $dependencies,
            $startDate,
            $duration,
            $data['priority'] ?? 'medium',
            null,
            null,
            null,
            $endDate
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
        if (isset($data['priority']))
            $task->priority = $data['priority'];
        if (isset($data['start_date']))
            $task->startDate = $data['start_date'];
        if (isset($data['end_date']))
            $task->endDate = $data['end_date'];
        if (isset($data['duration_days']))
            $task->durationDays = (int) $data['duration_days'];

        // Fallback endDate to dueDate if updating dates without strict endDate
        if (!isset($data['end_date']) && isset($data['due_date']) && $data['due_date']) {
            $task->endDate = $data['due_date'];
        }

        // Recompute duration based on dates if not explicitly provided
        if (!isset($data['duration_days']) && $task->startDate && $task->endDate) {
            $s = new \DateTime($task->startDate);
            $e = new \DateTime($task->endDate);
            $s->setTime(0, 0, 0);
            $e->setTime(0, 0, 0);
            $task->durationDays = max(1, $s->diff($e)->days + 1);
        }

        if (isset($data['dependencies'])) {
            $task->dependencies = json_encode($data['dependencies']);

            // Recalculate start date if dependencies changed
            $maxEndDate = null;
            foreach ($data['dependencies'] as $depId) {
                $depTask = $this->taskRepo->findById((int) $depId);
                if ($depTask && $depTask->endDate) {
                    if (!$maxEndDate || $depTask->endDate > $maxEndDate) {
                        $maxEndDate = $depTask->endDate;
                    }
                }
            }
            if ($maxEndDate) {
                // Ensure dependent tasks start the day AFTER the max dependency end date
                $maxDT = new \DateTime($maxEndDate);
                $maxDT->modify('+1 day');
                $minStartStr = $maxDT->format('Y-m-d');

                // If user selected date is before the allowed start date, force shift it!
                if ($task->startDate < $minStartStr) {
                    $task->startDate = $minStartStr;
                    // If we update start date, recalculate end date based on actual duration properly
                    if ($task->durationDays) {
                        $daysToAdd = max(0, $task->durationDays - 1);
                        $task->endDate = date('Y-m-d', strtotime($task->startDate . " + {$daysToAdd} days"));
                    }
                }
            }
        }

        $this->taskRepo->update($task);
        return $task;
    }

    public function getTasksByProject(int $projectId, ?int $teamId = null, bool $includeDeleted = false): array
    {
        $tasks = $this->taskRepo->findByProjectId($projectId, $teamId, $includeDeleted);

        // Enrich with isCompletable status
        foreach ($tasks as $task) {
            $task->isCompletable = $this->reviewService->isTaskCompletable($task->id);
        }

        return $tasks;
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
