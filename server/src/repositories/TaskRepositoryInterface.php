<?php

namespace App\Repositories;

use App\Domain\Task;

interface TaskRepositoryInterface
{
    public function create(Task $task): int;
    public function findById(int $id): ?Task;
    public function findByProjectId(int $projectId, ?int $teamId = null, bool $includeDeleted = false): array;
    public function update(Task $task): bool;
    public function delete(int $id): bool;
    public function restore(int $id): bool;
}
