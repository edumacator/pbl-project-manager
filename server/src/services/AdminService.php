<?php

namespace App\Services;

use App\Repositories\UserRepositoryInterface;
use App\Repositories\ClassRepositoryInterface;
use App\Repositories\ProjectRepositoryInterface;
use App\Repositories\TaskRepositoryInterface;

class AdminService
{
    private UserRepositoryInterface $userRepo;
    private ClassRepositoryInterface $classRepo;
    private ProjectRepositoryInterface $projectRepo;
    private TaskRepositoryInterface $taskRepo;

    public function __construct(
        UserRepositoryInterface $userRepo,
        ClassRepositoryInterface $classRepo,
        ProjectRepositoryInterface $projectRepo,
        TaskRepositoryInterface $taskRepo
    ) {
        $this->userRepo = $userRepo;
        $this->classRepo = $classRepo;
        $this->projectRepo = $projectRepo;
        $this->taskRepo = $taskRepo;
    }

    public function getAllUsers(): array
    {
        return $this->userRepo->findAll();
    }

    public function updateUser(int $id, array $data): bool
    {
        $user = $this->userRepo->findById($id);
        if (!$user) {
            return false;
        }

        if (isset($data['firstName']))
            $user->first_name = $data['firstName'];
        if (isset($data['lastName']))
            $user->last_name = $data['lastName'];
        if (isset($data['email']))
            $user->email = $data['email'];
        if (isset($data['role']))
            $user->role = $data['role'];

        $user->name = trim($user->first_name . ' ' . $user->last_name);

        return $this->userRepo->update($user);
    }

    public function deleteUser(int $id): bool
    {
        return $this->userRepo->delete($id);
    }

    public function getSystemStats(): array
    {
        $users = $this->userRepo->findAll();
        $projects = $this->projectRepo->findAll();
        // For simplicity, we'll just count them here. 
        // In a larger system, these would be dedicated count queries in repositories.

        $stats = [
            'users' => [
                'total' => count($users),
                'teachers' => count(array_filter($users, fn($u) => $u->role === 'teacher')),
                'students' => count(array_filter($users, fn($u) => $u->role === 'student')),
                'admins' => count(array_filter($users, fn($u) => $u->role === 'admin')),
            ],
            'projects' => [
                'total' => count($projects),
                'active' => count(array_filter($projects, fn($p) => $p->deletedAt === null)),
            ]
        ];

        return $stats;
    }

    public function getAllClasses(): array
    {
        return $this->classRepo->findAllWithTeachers();
    }
}
