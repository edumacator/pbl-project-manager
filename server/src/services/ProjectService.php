<?php

namespace App\Services;

use App\Domain\Project;
use App\Repositories\ProjectRepositoryInterface;
use App\Repositories\CheckpointRepositoryInterface;

class ProjectService
{
    private ProjectRepositoryInterface $projectRepo;
    private CheckpointRepositoryInterface $checkpointRepo;

    public function __construct(ProjectRepositoryInterface $projectRepo, CheckpointRepositoryInterface $checkpointRepo)
    {
        $this->projectRepo = $projectRepo;
        $this->checkpointRepo = $checkpointRepo;
    }

    public function createProject(array $data): array
    {
        // Basic validation (Phase 1)
        if (empty($data['title']) || empty($data['driving_question'])) {
            throw new \InvalidArgumentException("Title and Driving Question are required.");
        }

        $project = new Project(
            $data['title'],
            $data['driving_question'],
            $data['description'] ?? null,
            $data['teacher_id'] ?? null,
            $data['due_date'] ?? null,
            [], // classes
            null, // id
            null, // classId
            null, // createdAt
            (bool) ($data['requires_reflection'] ?? false),
            (bool) ($data['requires_milestone_reflection'] ?? false),
            (bool) ($data['require_critique'] ?? false),
            null, // deletedAt
            $data['default_tasks'] ?? [] // defaultTasks
        );

        $id = $this->projectRepo->create($project);
        $project->id = $id;

        // Assign to class if provided
        if (!empty($data['class_id'])) {
            if (method_exists($this->projectRepo, 'assignToClass')) {
                $this->projectRepo->assignToClass($id, (int) $data['class_id']);
            }
        }

        // Handle multiple classes
        if (!empty($data['class_ids']) && is_array($data['class_ids'])) {
            if (method_exists($this->projectRepo, 'syncClasses')) {
                $this->projectRepo->syncClasses($id, $data['class_ids']);
            }
        }

        // Handle Milestones
        if (!empty($data['milestones']) && is_array($data['milestones'])) {
            foreach ($data['milestones'] as $m) {
                if (empty($m['title']))
                    continue;
                $dueDate = !empty($m['due_date']) ? $m['due_date'] : null;
                $description = !empty($m['description']) ? $m['description'] : null;

                // Create checkpoint linked to project
                $checkpoint = new \App\Domain\Checkpoint($id, $m['title'], $dueDate, null, false, null, $description);
                $this->checkpointRepo->create($checkpoint);
            }
        }

        return ['project' => $this->projectRepo->findById($id)];
    }

    public function getProjectsByClass(int $classId, bool $includeDeleted = false): array
    {
        if (method_exists($this->projectRepo, 'findByClassId')) {
            return $this->projectRepo->findByClassId($classId, $includeDeleted);
        }
        return [];
    }

    public function getProjectsByTeacher(int $teacherId, bool $includeDeleted = false): array
    {
        if (method_exists($this->projectRepo, 'findByTeacherId')) {
            return $this->projectRepo->findByTeacherId($teacherId, $includeDeleted);
        }
        return [];
    }

    public function getProjectsByStudent(int $studentId, bool $includeDeleted = false): array
    {
        if (method_exists($this->projectRepo, 'findByStudentId')) {
            return $this->projectRepo->findByStudentId($studentId, $includeDeleted);
        }
        return [];
    }

    public function getAllProjects(bool $includeDeleted = false): array
    {
        return $this->projectRepo->findAll($includeDeleted);
    }

    public function assignProjectToClass(int $projectId, int $classId): bool
    {
        if (method_exists($this->projectRepo, 'assignToClass')) {
            return $this->projectRepo->assignToClass($projectId, $classId);
        }
        return false;
    }

    public function getProjectById(int $id): ?Project
    {
        return $this->projectRepo->findById($id);
    }

    public function updateProject(int $id, array $data): ?Project
    {
        $project = $this->projectRepo->findById($id);
        if (!$project) {
            return null;
        }

        // Update fields if provided
        if (isset($data['title']))
            $project->title = $data['title'];
        if (isset($data['driving_question']))
            $project->drivingQuestion = $data['driving_question'];
        if (isset($data['description']))
            $project->description = $data['description'];
        if (array_key_exists('due_date', $data))
            $project->dueDate = $data['due_date'];
        if (isset($data['requires_reflection']))
            $project->requiresReflection = (bool) $data['requires_reflection'];
        if (isset($data['requires_milestone_reflection']))
            $project->requiresMilestoneReflection = (bool) $data['requires_milestone_reflection'];
        if (isset($data['require_critique']))
            $project->requireCritique = (bool) $data['require_critique'];
        if (isset($data['default_tasks']))
            $project->defaultTasks = $data['default_tasks'];

        $this->projectRepo->update($id, $project);

        // Sync Classes if provided
        if (isset($data['class_ids']) && is_array($data['class_ids'])) {
            if (method_exists($this->projectRepo, 'syncClasses')) {
                $this->projectRepo->syncClasses($id, $data['class_ids']);
            }
        }

        // Sync Milestones
        if (isset($data['milestones']) && is_array($data['milestones'])) {
            $existingCheckpoints = $this->checkpointRepo->findByProjectId($id);
            $existingIds = array_map(fn($c) => $c->id, $existingCheckpoints);
            $payLoadIds = [];

            foreach ($data['milestones'] as $m) {
                // If ID is set and exists in this project, update it
                // If ID is null or not found, create it
                if (!empty($m['id']) && in_array($m['id'], $existingIds)) {
                    $payLoadIds[] = $m['id'];
                    $checkpoint = $this->checkpointRepo->findById($m['id']);
                    // ideally we'd load correct object or just instantiate
                    // Since we know it belongs to this project (checked above), we can just update properties
                    if ($checkpoint) {
                        $checkpoint->title = $m['title'];
                        $checkpoint->description = $m['description'] ?? null;
                        $checkpoint->dueDate = !empty($m['due_date']) ? $m['due_date'] : null;
                        $this->checkpointRepo->update($checkpoint);
                    }
                } else {
                    // Create new
                    if (empty($m['title']))
                        continue;
                    $dueDate = !empty($m['due_date']) ? $m['due_date'] : null;
                    $description = !empty($m['description']) ? $m['description'] : null;

                    $newCp = new \App\Domain\Checkpoint($id, $m['title'], $dueDate, null, false, null, $description);
                    $this->checkpointRepo->create($newCp);
                }
            }

            // Delete removed checkpoints
            // Note: If we just sent the list of 'active' milestones, anything else should be deleted
            // But we need to be careful not to delete class-specific ones? 
            // findByProjectId only returns project-level (where project_id is set). 
            // So yes, we can delete those not in payload.
            $toDelete = array_diff($existingIds, $payLoadIds);
            foreach ($toDelete as $delId) {
                $this->checkpointRepo->delete($delId);
            }
        }

        return $this->projectRepo->findById($id);
    }

    public function deleteProject(int $id): bool
    {
        return $this->projectRepo->delete($id);
    }

    public function restoreProject(int $id): bool
    {
        if (method_exists($this->projectRepo, 'restore')) {
            return $this->projectRepo->restore($id);
        }
        return false;
    }
}
