<?php

namespace App\Services;

use App\Repositories\UserRepositoryInterface;
use App\Domain\User;

class AuthService
{
    private UserRepositoryInterface $userRepo;

    public function __construct(UserRepositoryInterface $userRepo)
    {
        $this->userRepo = $userRepo;
    }

    public function login(string $email, string $password): ?User
    {
        $user = $this->userRepo->findByEmail($email);

        if ($user && password_verify($password, $user->password_hash)) {
            // Generate a simple token (in production, use JWT or stronger session id)
            $token = bin2hex(random_bytes(32));
            $this->userRepo->updateAuthToken($user->id, $token);
            $user->auth_token = $token;
            return $user;
        }

        return null;
    }

    public function register(string $firstName, string $lastName, string $email, string $password, string $role): User
    {
        $existing = $this->userRepo->findByEmail($email);
        if ($existing) {
            throw new \InvalidArgumentException("Email already in use.");
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $name = trim("$firstName $lastName");
        $token = bin2hex(random_bytes(32));

        $user = new User($name, $email, $role, null, $firstName, $lastName, $hash, $token);
        $id = $this->userRepo->create($user);
        $user->id = $id;

        return $user;
    }

    public function resetStudentPassword(int $teacherId, int $studentId, string $newPassword): void
    {
        // Ideally we would verify the student belongs to one of the teacher's classes here.
        // For MVP, we'll verify the target user is a student.
        $student = $this->userRepo->findById($studentId);
        if (!$student || $student->role !== 'student') {
            throw new \InvalidArgumentException("Invalid student ID.");
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $this->userRepo->updatePassword($studentId, $hash);
        // We could also invalidate their token here if desired
        $this->userRepo->updateAuthToken($studentId, null);
    }

    public function authenticateByToken(string $token): ?User
    {
        return $this->userRepo->findByToken($token);
    }
}
