<?php

namespace App\Services;

use App\Repositories\MySQL\ProjectRepository;
use App\Repositories\MySQL\TeamRepository;
use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\CheckpointRepository;

class ProjectBoardService
{
    private ProjectRepository $projectRepo;
    private TeamRepository $teamRepo;
    private TaskRepository $taskRepo;
    private CheckpointRepository $checkpointRepo;

    public function __construct()
    {
        // Manual injection for now, as per pattern
        $this->projectRepo = new ProjectRepository();
        $this->teamRepo = new TeamRepository();
        $this->taskRepo = new TaskRepository();
        $this->checkpointRepo = new CheckpointRepository();
    }

    public function getTeamContext(int $projectId, int $studentId): array
    {
        // 1. Verify Team Membership
        // Get all teams for project
        $teams = $this->teamRepo->findByProjectId($projectId);
        $studentTeam = null;

        foreach ($teams as $team) {
            $members = $this->teamRepo->getMembers($team->id);
            foreach ($members as $member) {
                if ($member['id'] === $studentId) {
                    $studentTeam = $team;
                    $studentTeam->members = $members; // Attach members
                    break 2;
                }
            }
        }

        if (!$studentTeam) {
            throw new \Exception("Access Denied: You are not a member of any team in this project.", 403);
        }

        // 2. Get Project Details
        $project = $this->projectRepo->findById($projectId);
        if (!$project) {
            throw new \Exception("Project not found.", 404);
        }

        // 3. Get Team Tasks
        $tasks = $this->taskRepo->findByProjectId($projectId, $studentTeam->id);

        // 4. Get Milestones/Checkpoints
        // We need class-specific checkpoints too.
        // But for now, let's get project checkpoints.
        // Ideally we start from TimelineService logic, but let's keep it simple.
        $checkpoints = $this->checkpointRepo->findByProjectId($projectId);

        // 5. Aggregate
        return [
            'project' => $project,
            'team' => $studentTeam,
            'tasks' => $tasks,
            'milestones' => $checkpoints
        ];
    }
}
