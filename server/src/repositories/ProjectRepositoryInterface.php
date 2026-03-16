<?php

namespace App\Repositories;

use App\Domain\Project;

interface ProjectRepositoryInterface
{
    public function create(Project $project): int;
    public function findById(int $id): ?Project;
    public function findAll(bool $includeDeleted = false): array;
    public function update(int $id, Project $project): bool;
    public function delete(int $id): bool;
    public function restore(int $id): bool;
    public function findByAuthorId(int $authorId, bool $includeDeleted = false): array;
    public function findByClassId(int $classId, bool $includeDeleted = false): array;
    public function findByStudentId(int $studentId, bool $includeDeleted = false): array;
}
