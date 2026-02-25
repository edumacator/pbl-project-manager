<?php

namespace App\Repositories;

use App\Domain\ClassEntity;

interface ClassRepositoryInterface
{
    public function create(ClassEntity $class): int;
    public function update(ClassEntity $class): bool;
    public function delete(int $id): bool;
    public function restore(int $id): bool;
    public function findById(int $id): ?ClassEntity;
    public function findByTeacherId(int $teacherId, bool $includeDeleted = false): array;
    public function enrollStudent(int $classId, int $studentId): bool;
    public function getStudents(int $classId): array; // Returns array of User objects
}
