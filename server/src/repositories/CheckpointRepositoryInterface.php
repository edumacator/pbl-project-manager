<?php

namespace App\Repositories;

use App\Domain\Checkpoint;

interface CheckpointRepositoryInterface
{
    public function create(Checkpoint $checkpoint): int;
    public function update(Checkpoint $checkpoint): bool;
    public function delete(int $id): bool;
    public function findByProjectId(int $projectId): array;
    public function findByClassId(int $classId): array;
    public function findById(int $id): ?Checkpoint;
}
