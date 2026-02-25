<?php

namespace App\Repositories\MySQL;

use App\Domain\User;
use App\Repositories\UserRepositoryInterface;
use PDO;

class UserRepository implements UserRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function findById(int $id): ?User
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->mapRowToUser($row) : null;
    }

    public function findByEmail(string $email): ?User
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();

        return $row ? $this->mapRowToUser($row) : null;
    }

    public function create(User $user): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (first_name, last_name, name, email, role, password_hash, auth_token)
            VALUES (:first_name, :last_name, :name, :email, :role, :password_hash, :auth_token)
        ");

        $stmt->execute([
            ':first_name' => $user->first_name,
            ':last_name' => $user->last_name,
            ':name' => $user->name,
            ':email' => $user->email,
            ':role' => $user->role,
            ':password_hash' => $user->password_hash,
            ':auth_token' => $user->auth_token
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateAuthToken(int $userId, ?string $token): void
    {
        $stmt = $this->pdo->prepare("UPDATE users SET auth_token = :token WHERE id = :id");
        $stmt->execute([':token' => $token, ':id' => $userId]);
    }

    public function updatePassword(int $userId, string $hash): void
    {
        $stmt = $this->pdo->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
        $stmt->execute([':hash' => $hash, ':id' => $userId]);
    }

    public function findByToken(string $token): ?User
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE auth_token = :token");
        $stmt->execute([':token' => $token]);
        $row = $stmt->fetch();
        return $row ? $this->mapRowToUser($row) : null;
    }

    private function mapRowToUser(array $row): User
    {
        return new User(
            $row['name'],
            $row['email'],
            $row['role'],
            (int) $row['id'],
            $row['first_name'] ?? '',
            $row['last_name'] ?? '',
            $row['password_hash'] ?? null,
            $row['auth_token'] ?? null
        );
    }

    public function search(string $query, ?string $role = null): array
    {
        $sql = "SELECT * FROM users WHERE (name LIKE :query_name OR email LIKE :query_email)";
        $params = [
            ':query_name' => "%$query%",
            ':query_email' => "%$query%"
        ];

        if ($role) {
            $sql .= " AND role = :role";
            $params[':role'] = $role;
        }

        $sql .= " ORDER BY name ASC LIMIT 20";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $users = [];
        foreach ($rows as $row) {
            $users[] = $this->mapRowToUser($row);
        }
        return $users;
    }
}
