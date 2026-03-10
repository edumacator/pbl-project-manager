<?php

namespace App\Repositories;

use App\Domain\TaskChecklistItem;

interface TaskChecklistItemRepositoryInterface
{
    public function findById(int $id): ?TaskChecklistItem;
    public function findByTaskId(int $taskId): array;
    public function create(TaskChecklistItem $item): int;
    public function update(TaskChecklistItem $item): bool;
    public function delete(int $id): bool;
}
