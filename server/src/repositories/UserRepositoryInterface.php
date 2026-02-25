<?php

namespace App\Repositories;

use App\Domain\User;

interface UserRepositoryInterface
{
    public function findById(int $id): ?User;
    public function findByEmail(string $email): ?User;
    public function findByToken(string $token): ?User;
    public function create(User $user): int;
    public function search(string $query, ?string $role = null): array;
    public function updateAuthToken(int $userId, ?string $token): void;
    public function updatePassword(int $userId, string $hash): void;
}
