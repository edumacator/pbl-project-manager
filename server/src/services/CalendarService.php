<?php

namespace App\Services;

use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\ProjectRepository;
use App\Repositories\MySQL\TeamRepository;
use App\Repositories\MySQL\CheckpointRepository;
use App\Repositories\MySQL\ProjectResourceRepository;
use App\Domain\User;

class CalendarService
{
    private TaskRepository $taskRepo;
    private ProjectRepository $projectRepo;
    private TeamRepository $teamRepo;
    private CheckpointRepository $checkpointRepo;
    private ProjectResourceRepository $resourceRepo;
    private string $frontendUrl;
    private array $projectClassCache = [];

    public function __construct(
        TaskRepository $taskRepo,
        ProjectRepository $projectRepo,
        TeamRepository $teamRepo,
        CheckpointRepository $checkpointRepo,
        ProjectResourceRepository $resourceRepo,
        string $frontendUrl = ''
    ) {
        $this->taskRepo = $taskRepo;
        $this->projectRepo = $projectRepo;
        $this->teamRepo = $teamRepo;
        $this->checkpointRepo = $checkpointRepo;
        $this->resourceRepo = $resourceRepo;
        $this->frontendUrl = rtrim($frontendUrl, '/');
    }

    public function getEvents(User $user, array $filters = [], bool $enrich = false): array
    {
        $events = [];
        $scope = $filters['scope'] ?? 'all';
        $projectId = isset($filters['project_id']) ? (int) $filters['project_id'] : null;
        $teamId = isset($filters['team_id']) ? (int) $filters['team_id'] : null;

        $includeTasks = $filters['include_tasks'] ?? true;
        $includeMilestones = $filters['include_milestones'] ?? true;
        $includeProjects = $filters['include_projects'] ?? true;

        if ($user->role === 'student') {
            // Student: Get their tasks and team events
            if ($scope === 'my-tasks') {
                $events = $this->getMyTaskEvents($user->id, $enrich, $user->role);
            } elseif ($scope === 'my-team') {
                $teams = $this->teamRepo->findByUserId($user->id);
                foreach ($teams as $team) {
                    $events = array_merge($events, $this->getTeamEvents($team->id, $includeTasks, $includeMilestones, $enrich, $user->role));
                }
            } else {
                // Default: My tasks + Team milestones
                $events = $this->getMyTaskEvents($user->id, $enrich, $user->role);
                $teams = $this->teamRepo->findByUserId($user->id);
                foreach ($teams as $team) {
                    $events = array_merge($events, $this->getTeamEvents($team->id, false, true, $enrich, $user->role));
                }
            }
        } else {
            // Teacher / Admin
            if ($projectId) {
                if ($teamId) {
                    $events = array_merge($events, $this->getTeamEvents($teamId, $includeTasks, $includeMilestones, $enrich, $user->role));
                } else {
                    $events = array_merge($events, $this->getProjectEvents($projectId, $includeTasks, $includeMilestones, $includeProjects, $enrich, $user->role));
                }
            } else {
                // All relevant projects
                if ($user->role === 'admin') {
                    $projects = $this->projectRepo->findAll();
                } else {
                    $projects = $this->projectRepo->findByAuthorId($user->id);
                }
                
                foreach ($projects as $project) {
                    $events = array_merge($events, $this->getProjectEvents($project->id, $includeTasks, $includeMilestones, $includeProjects, $enrich, $user->role));
                }
            }
        }

        return $events;
    }

    private function getMyTaskEvents(int $userId, bool $enrich = false, string $userRole = 'student'): array
    {
        $tasks = $this->taskRepo->findByAssigneeId($userId);
        return array_map(function($t) use ($enrich, $userRole) {
            $className = $this->getClassNameForProject($t->projectId);
            return $this->normalizeTask($t, null, $className, $enrich, $userRole);
        }, $tasks);
    }

    private function getTeamEvents(int $teamId, bool $includeTasks, bool $includeMilestones, bool $enrich = false, string $userRole = 'student'): array
    {
        $events = [];
        $team = $this->teamRepo->findById($teamId);
        if (!$team) return [];

        if ($includeTasks) {
            $tasks = $this->taskRepo->findByProjectId($team->projectId, $teamId);
            $className = $this->getClassNameForProject($team->projectId);
            $events = array_merge($events, array_map(fn($t) => $this->normalizeTask($t, $team->name, $className, $enrich, $userRole), $tasks));
        }

        if ($includeMilestones) {
            $checkpoints = $this->checkpointRepo->findByProjectId($team->projectId);
            $className = $this->getClassNameForProject($team->projectId);
            $events = array_merge($events, array_map(fn($c) => $this->normalizeCheckpoint($c, $className), $checkpoints));
            
            if ($team->classId) {
                $classCheckpoints = $this->checkpointRepo->findByClassId($team->classId);
                // For class milestones, the class name is already known or can be fetched
                $cName = $className; // Fallback
                $events = array_merge($events, array_map(fn($c) => $this->normalizeCheckpoint($c, $cName), $classCheckpoints));
            }
        }

        return $events;
    }

    private function getProjectEvents(int $projectId, bool $includeTasks, bool $includeMilestones, bool $includeProjects, bool $enrich = false, string $userRole = 'student'): array
    {
        $events = [];
        $project = $this->projectRepo->findById($projectId);
        if (!$project) return [];

        if ($includeProjects && $project->dueDate) {
            $events[] = $this->normalizeProject($project);
        }

        if ($includeMilestones) {
            $checkpoints = $this->checkpointRepo->findByProjectId($projectId);
            $className = $this->getClassNameForProject($projectId);
            $events = array_merge($events, array_map(fn($c) => $this->normalizeCheckpoint($c, $className), $checkpoints));
        }

        if ($includeTasks) {
            $tasks = $this->taskRepo->findByProjectId($projectId);
            $className = $this->getClassNameForProject($projectId);
            $events = array_merge($events, array_map(fn($t) => $this->normalizeTask($t, null, $className, $enrich, $userRole), $tasks));
        }

        return $events;
    }

    public function normalizeTask($task, $teamName = null, $className = null, bool $enrich = false, string $userRole = 'student'): array
    {
        $description = $task->description;
        
        if ($enrich) {
            $basePath = ($userRole === 'teacher' || $userRole === 'admin') ? 'projects' : 'student/projects';
            $deepLink = "{$this->frontendUrl}/{$basePath}/{$task->projectId}?task={$task->id}";
            
            $description = "Task: {$task->title}\n" .
                          "Due: " . ($task->dueDate ? substr($task->dueDate, 0, 10) : 'N/A') . "\n\n" .
                          ($task->description ?: "No description provided.") . 
                          "\n\nView Task in PBL Manager:\n{$deepLink}";
        }

        return [
            'id' => 'task-' . $task->id,
            'sourceType' => 'task',
            'sourceId' => $task->id,
            'title' => $task->title,
            'description' => $description,
            'due_date' => $task->dueDate ? substr($task->dueDate, 0, 10) : null,
            'start_date' => $task->startDate ? substr($task->startDate, 0, 10) : null,
            'allDay' => true,
            'status' => $task->status,
            'priority' => $task->priority,
            'team_id' => $task->teamId,
            'team_name' => $teamName ?? $task->teamName,
            'assignee_name' => $task->assigneeName,
            'class_name' => $className,
            'project_id' => $task->projectId,
            'is_stuck' => (bool)$task->isStuck,
            'color' => $task->isStuck ? '#F59E0B' : $this->getStatusColor($task->status)
        ];
    }

    public function normalizeCheckpoint($checkpoint, $className = null): array
    {
        return [
            'id' => 'checkpoint-' . $checkpoint->id,
            'sourceType' => 'checkpoint',
            'sourceId' => $checkpoint->id,
            'title' => 'Milestone: ' . $checkpoint->title,
            'description' => $checkpoint->description,
            'due_date' => $checkpoint->dueDate ? substr($checkpoint->dueDate, 0, 10) : null,
            'allDay' => true,
            'is_hard_deadline' => $checkpoint->isHardDeadline,
            'project_id' => $checkpoint->projectId,
            'class_name' => $className,
            'color' => '#EF4444' // Red for milestones
        ];
    }

    public function normalizeProject($project): array
    {
        $className = $this->getClassNameForProject($project->id);
        return [
            'id' => 'project-' . $project->id,
            'sourceType' => 'project',
            'sourceId' => $project->id,
            'title' => 'Project Due: ' . $project->title,
            'due_date' => $project->dueDate ? substr($project->dueDate, 0, 10) : null,
            'allDay' => true,
            'project_id' => $project->id,
            'class_name' => $className,
            'color' => '#8B5CF6' // Purple for projects
        ];
    }

    private function getClassNameForProject(int $projectId): ?string
    {
        if (isset($this->projectClassCache[$projectId])) {
            return $this->projectClassCache[$projectId];
        }

        $project = $this->projectRepo->findById($projectId);
        if ($project && !empty($project->classes)) {
            $this->projectClassCache[$projectId] = $project->classes[0]['name'];
            return $this->projectClassCache[$projectId];
        }

        return null;
    }

    private function getStatusColor(string $status): string
    {
        return match ($status) {
            'todo' => '#6B7280',
            'doing' => '#3B82F6',
            'done' => '#10B981',
            default => '#9CA3AF'
        };
    }

    public function generateIcs(array $events): string
    {
        $ics = "BEGIN:VCALENDAR\r\n";
        $ics .= "VERSION:2.0\r\n";
        $ics .= "PRODID:-//PBL Project Manager//NONSGML v1.0//EN\r\n";
        $ics .= "CALSCALE:GREGORIAN\r\n";
        $ics .= "METHOD:PUBLISH\r\n";

        foreach ($events as $event) {
            if (empty($event['due_date'])) continue;

            $date = new \DateTime($event['due_date']);
            $dateStr = $date->format('Ymd');
            
            // DTEND for an all-day event should be the next day
            $endDate = clone $date;
            $endDate->modify('+1 day');
            $endDateStr = $endDate->format('Ymd');

            $uid = $event['id'] . '@pbl-manager.local';
            $summary = $event['title'];
            $description = $event['description'] ?? '';

            $ics .= "BEGIN:VEVENT\r\n";
            $ics .= "UID:$uid\r\n";
            $ics .= "DTSTAMP:" . date('Ymd\THis\Z') . "\r\n";
            $ics .= "DTSTART;VALUE=DATE:$dateStr\r\n";
            $ics .= "DTEND;VALUE=DATE:$endDateStr\r\n";
            $ics .= "SUMMARY:$summary\r\n";
            if ($description) {
                $ics .= "DESCRIPTION:" . $this->escapeIcs($description) . "\r\n";
            }
            $ics .= "END:VEVENT\r\n";
        }

        $ics .= "END:VCALENDAR\r\n";
        return $ics;
    }

    private function escapeIcs(string $text): string
    {
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace(',', '\\,', $text);
        $text = str_replace(';', '\\;', $text);
        $text = str_replace("\n", '\\n', $text);
        return $text;
    }
}
