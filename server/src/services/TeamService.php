<?php

namespace App\Services;

use App\Repositories\TeamRepositoryInterface;
use App\Domain\Team;

class TeamService
{
    private TeamRepositoryInterface $teamRepo;

    public function __construct(TeamRepositoryInterface $teamRepo)
    {
        $this->teamRepo = $teamRepo;
    }

    public function createTeam(int $projectId, int $classId, string $name): Team
    {
        if (empty($name)) {
            throw new \InvalidArgumentException("Team name is required.");
        }

        $team = new Team($projectId, $classId, $name);
        $id = $this->teamRepo->create($team);
        $team->id = $id;

        return $team;
    }

    public function getTeamsByProjectAndClass(int $projectId, int $classId): array
    {
        if (method_exists($this->teamRepo, 'findByProjectAndClass')) {
            return $this->teamRepo->findByProjectAndClass($projectId, $classId);
        }
        // Fallback for interface compliance if generic
        return $this->teamRepo->findByProjectId($projectId);
    }

    public function getTeamsByProject(int $projectId): array
    {
        return $this->teamRepo->findByProjectId($projectId);
    }

    public function addMember(int $teamId, int $userId): bool
    {
        return $this->teamRepo->addMember($teamId, $userId);
    }

    public function removeMember(int $teamId, int $userId): bool
    {
        return $this->teamRepo->removeMember($teamId, $userId);
    }
}
