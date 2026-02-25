<?php

namespace App\Services;

use App\Repositories\ClassRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use App\Domain\ClassEntity;

class ClassService
{
    private ClassRepositoryInterface $classRepo;
    private UserRepositoryInterface $userRepo;
    private ?ProjectService $projectService = null;

    public function __construct(
        ClassRepositoryInterface $classRepo,
        UserRepositoryInterface $userRepo
    ) {
        $this->classRepo = $classRepo;
        $this->userRepo = $userRepo;
    }

    public function setProjectService(ProjectService $service)
    {
        $this->projectService = $service;
    }

    public function createClass(string $name, int $teacherId): ClassEntity
    {
        if (empty($name)) {
            throw new \InvalidArgumentException("Class name is required.");
        }

        $class = new ClassEntity($name, $teacherId);
        $id = $this->classRepo->create($class);
        $class->id = $id;

        return $class;
    }

    public function updateClass(int $id, string $name): bool
    {
        $class = $this->classRepo->findById($id);
        if (!$class) {
            throw new \Exception("Class not found.");
        }
        $class->name = $name;
        return $this->classRepo->update($class);
    }

    public function deleteClass(int $id): bool
    {
        return $this->classRepo->delete($id);
    }

    public function restoreClass(int $id): bool
    {
        return $this->classRepo->restore($id);
    }

    public function getClassesByTeacher(int $teacherId, bool $includeDeleted = false): array
    {
        return $this->classRepo->findByTeacherId($teacherId, $includeDeleted);
    }

    public function getClassDetails(int $id, bool $includeDeleted = false): ?array
    {
        $class = $this->classRepo->findById($id);
        if (!$class) {
            return null;
        }

        $students = $this->classRepo->getStudents($id);
        $projects = $this->projectService ? $this->projectService->getProjectsByClass($id, $includeDeleted) : [];

        return [
            'class' => $class,
            'students' => $students,
            'projects' => $projects
        ];
    }

    public function enrollStudent(int $classId, int $studentId): bool
    {
        return $this->classRepo->enrollStudent($classId, $studentId);
    }

    public function enrollStudentByEmail(int $classId, string $email, string $name = ''): \App\Domain\User
    {
        // 1. Check if user exists
        $user = $this->userRepo->findByEmail($email);

        if (!$user) {
            // 2. Create new student user
            if (empty($name)) {
                $name = explode('@', $email)[0]; // Default name from email
            }
            // Create user object (ID null)
            $newUser = new \App\Domain\User($name, $email, 'student');
            $userId = $this->userRepo->create($newUser);
            $newUser->id = $userId;
            $user = $newUser;
        }

        // 3. Enroll
        $this->enrollStudent($classId, (int) $user->id);

        return $user;
    }

    public function getStudents(int $classId): array
    {
        return $this->classRepo->getStudents($classId);
    }
}
