<?php

namespace App\Repositories;

use App\Domain\Team;

interface TeamRepositoryInterface
{
    public function create(Team $team): int;
    public function findByProjectId(int $projectId): array;
    public function findById(int $id): ?Team;
    public function addMember(int $teamId, int $userId): bool;
    public function removeMember(int $teamId, int $userId): bool;
}
