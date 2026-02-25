<?php

namespace App\Services;

use App\Repositories\CheckpointRepositoryInterface;
use App\Repositories\ReflectionRepositoryInterface;
use App\Domain\Checkpoint;
use App\Domain\Reflection;

class CheckpointService
{
    private CheckpointRepositoryInterface $checkpointRepo;
    private ReflectionRepositoryInterface $reflectionRepo;

    public function __construct(
        CheckpointRepositoryInterface $checkpointRepo,
        ReflectionRepositoryInterface $reflectionRepo
    ) {
        $this->checkpointRepo = $checkpointRepo;
        $this->reflectionRepo = $reflectionRepo;
    }

    public function createCheckpoint(int $projectId, string $title, ?string $dueDate): Checkpoint
    {
        if (empty($title)) {
            throw new \InvalidArgumentException("Checkpoint title is required.");
        }

        $checkpoint = new Checkpoint($projectId, $title, $dueDate);
        $id = $this->checkpointRepo->create($checkpoint);
        $checkpoint->id = $id;

        return $checkpoint;
    }

    public function createClassCheckpoint(int $classId, string $title, ?string $dueDate): Checkpoint
    {
        if (empty($title)) {
            throw new \InvalidArgumentException("Checkpoint title is required.");
        }

        // Pass null for projectId, and classId as last arg
        $checkpoint = new Checkpoint(null, $title, $dueDate, null, false, $classId);
        $id = $this->checkpointRepo->create($checkpoint);
        $checkpoint->id = $id;

        return $checkpoint;
    }

    public function getCheckpointsByProject(int $projectId): array
    {
        return $this->checkpointRepo->findByProjectId($projectId);
    }

    public function getCheckpointsByClass(int $classId): array
    {
        return $this->checkpointRepo->findByClassId($classId);
    }

    public function submitReflection(int $userId, int $checkpointId, array $data): Reflection
    {
        if (empty($data['content'])) {
            throw new \InvalidArgumentException("Reflection content is required.");
        }
        $type = $data['type'] ?? 'content';
        if (!in_array($type, ['content', 'process', 'purpose'])) {
            throw new \InvalidArgumentException("Invalid reflection type.");
        }

        $reflection = new Reflection($userId, $checkpointId, $type, $data['content']);
        $id = $this->reflectionRepo->create($reflection);
        $reflection->id = $id;

        return $reflection;
    }

    public function getReflectionsForCheckpoint(int $checkpointId): array
    {
        return $this->reflectionRepo->findByCheckpointId($checkpointId);
    }
}
