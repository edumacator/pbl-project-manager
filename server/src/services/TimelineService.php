<?php

namespace App\Services;

use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\ProjectRepository;
use App\Repositories\MySQL\TeamRepository;
use App\Repositories\MySQL\CheckpointRepository;

class TimelineService
{
    private TaskRepository $taskRepo;
    private ProjectRepository $projectRepo;
    private TeamRepository $teamRepo;
    private CheckpointRepository $checkpointRepo;
    private ReviewService $reviewService;

    public function __construct(
        TaskRepository $taskRepo,
        ProjectRepository $projectRepo,
        TeamRepository $teamRepo,
        CheckpointRepository $checkpointRepo,
        ReviewService $reviewService
    ) {
        $this->taskRepo = $taskRepo;
        $this->projectRepo = $projectRepo;
        $this->teamRepo = $teamRepo;
        $this->checkpointRepo = $checkpointRepo;
        $this->reviewService = $reviewService;
    }

    public function getTeamTimeline(int $teamId, bool $includeDeleted = false): array
    {
        // 1. Get Team to find Project ID
        $team = $this->teamRepo->findById($teamId);
        if (!$team) {
            throw new \Exception("Team not found");
        }
        $projectId = $team->projectId;

        // 2. Get Project Bounds
        $project = $this->projectRepo->findById($projectId);
        if (!$project) {
            throw new \Exception("Project not found");
        }

        // 3. Get Tasks
        $tasks = $this->taskRepo->findByProjectId($projectId, $teamId, $includeDeleted);

        // 5. Calculate Blocked Status
        $taskStatusMap = [];
        foreach ($tasks as $task) {
            $taskStatusMap[$task->id] = $task->status;
        }

        $tasksById = [];
        foreach ($tasks as $task) {
            $tasksById[$task->id] = $task;
        }

        $memo = [];
        $calculateDates = function ($taskId) use (&$calculateDates, &$memo, $tasksById) {
            if (isset($memo[$taskId]))
                return $memo[$taskId];

            $task = $tasksById[$taskId];

            // Prioritize stored start_date, then dependency based, then today
            $startDate = null;
            if ($task->startDate) {
                $startDate = strtotime($task->startDate);
            }

            // Check Dependencies for auto-dating if not manually specified or if we want to enforce it
            $deps = $task->dependencies ? json_decode($task->dependencies, true) : [];
            if (!empty($deps)) {
                $maxDepEnd = 0;
                foreach ($deps as $depId) {
                    if (isset($tasksById[$depId])) {
                        $depDates = $calculateDates($depId);
                        if ($depDates['end'] > $maxDepEnd) {
                            $maxDepEnd = $depDates['end'];
                        }
                    }
                }
                if ($maxDepEnd > 0) {
                    // Start date is at least the max dependency end date if it wasn't manually set
                    if (!$startDate || $maxDepEnd > $startDate) {
                        $startDate = $maxDepEnd;
                    }
                }
            }

            if (!$startDate) {
                $startDate = time();
            }

            // Determine End Date: Prioritize stored end_date
            $endDate = null;
            if ($task->endDate) {
                $endDate = strtotime($task->endDate);
            } elseif ($task->dueDate) {
                $endDate = strtotime($task->dueDate);
            } else {
                $durationSeconds = ($task->durationDays ?: 1) * 86400;
                $endDate = $startDate + $durationSeconds;
            }

            if ($endDate < $startDate)
                $endDate = $startDate;

            $memo[$taskId] = ['start' => $startDate, 'end' => $endDate];
            return $memo[$taskId];
        };

        $timelineTasks = array_map(function ($task) use ($taskStatusMap, $calculateDates) {
            $isBlocked = false;
            $deps = $task->dependencies ? json_decode($task->dependencies, true) : [];
            if (!empty($deps)) {
                foreach ($deps as $depId) {
                    if (isset($taskStatusMap[$depId]) && $taskStatusMap[$depId] !== 'done') {
                        $isBlocked = true;
                        break;
                    }
                }
            }

            // Calculate Dates
            $dates = $calculateDates($task->id);

            // Return array representation with extra fields
            $data = $task->jsonSerialize();
            $data['is_blocked'] = $isBlocked;
            $data['is_completable'] = $this->reviewService->isTaskCompletable($task->id);

            // Override dates with calculated ones for display
            $data['start_date'] = date('Y-m-d', $dates['start']);
            $data['end_date'] = date('Y-m-d', $dates['end']);

            // Calculate effective duration in days
            $data['duration_days'] = ceil(($dates['end'] - $dates['start']) / 86400) ?: 1;

            return $data;

        }, $tasks);

        // 6. Get Milestones (Checkpoints) for context
        $projectCheckpoints = $this->checkpointRepo->findByProjectId($projectId);

        // Fetch Class Checkpoints if class_id is available on project (it should be)
        $classCheckpoints = [];
        if (!empty($project->classId)) {
            $classCheckpoints = $this->checkpointRepo->findByClassId($project->classId);
        }

        // Merge and sort by date
        $allCheckpoints = array_merge($projectCheckpoints, $classCheckpoints);
        usort($allCheckpoints, function ($a, $b) {
            return strtotime($a->dueDate) - strtotime($b->dueDate);
        });

        return [
            'project' => [
                'id' => $project->id,
                'title' => $project->title,
                'start_date' => $project->createdAt ? date('Y-m-d', strtotime($project->createdAt)) : null,
                'end_date' => $project->dueDate,
            ],
            'tasks' => $timelineTasks,
            'milestones' => $allCheckpoints
        ];
    }
}
