<?php

namespace App\Repositories;

use App\Domain\Reflection;

interface ReflectionRepositoryInterface
{
    public function create(Reflection $reflection): int;
    public function findByCheckpointId(int $checkpointId): array;
    public function findByUserId(int $userId): array;
}
