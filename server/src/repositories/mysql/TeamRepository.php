<?php

namespace App\Repositories\MySQL;

use App\Domain\Team;
use App\Repositories\TeamRepositoryInterface;
use PDO;

class TeamRepository implements TeamRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(Team $team): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO teams (project_id, class_id, name)
            VALUES (:project_id, :class_id, :name)
        ");

        $stmt->execute([
            ':project_id' => $team->projectId,
            ':class_id' => $team->classId,
            ':name' => $team->name
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByProjectAndClass(int $projectId, int $classId): array
    {
        // Join with Classes to get name
        $stmt = $this->pdo->prepare("
            SELECT t.*, c.name as class_name 
            FROM teams t
            LEFT JOIN classes c ON t.class_id = c.id
            WHERE t.project_id = :project_id AND t.class_id = :class_id
        ");
        $stmt->execute([
            ':project_id' => $projectId,
            ':class_id' => $classId
        ]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToTeam'], $rows);
    }

    // Deprecated or generic findByProject (returns all teams across all classes)
    public function findByProjectId(int $projectId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT t.*, c.name as class_name 
            FROM teams t
            LEFT JOIN classes c ON t.class_id = c.id
            WHERE t.project_id = :project_id
        ");
        $stmt->execute([':project_id' => $projectId]);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToTeam'], $rows);
    }

    public function findById(int $id): ?Team
    {
        $stmt = $this->pdo->prepare("
            SELECT t.*, c.name as class_name 
            FROM teams t
            LEFT JOIN classes c ON t.class_id = c.id
            WHERE t.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->mapRowToTeam($row) : null;
    }

    private function mapRowToTeam(array $row): Team
    {
        $teamId = (int) $row['id'];
        $members = $this->getMembers($teamId);

        return new Team(
            (int) $row['project_id'],
            (int) ($row['class_id'] ?? 1),
            $row['name'],
            $teamId,
            $row['class_name'] ?? null,
            $members
        );
    }

    public function getMembers(int $teamId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT u.id, u.name, u.email, u.role
            FROM users u
            JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = :team_id
        ");
        $stmt->execute([':team_id' => $teamId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addMember(int $teamId, int $userId): bool
    {
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO team_members (team_id, user_id) VALUES (:team_id, :user_id)");
        return $stmt->execute([':team_id' => $teamId, ':user_id' => $userId]);
    }

    public function removeMember(int $teamId, int $userId): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM team_members WHERE team_id = :team_id AND user_id = :user_id");
        return $stmt->execute([':team_id' => $teamId, ':user_id' => $userId]);
    }
}
