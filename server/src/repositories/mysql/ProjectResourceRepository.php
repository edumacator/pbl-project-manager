<?php

namespace App\Repositories\MySQL;

use App\Domain\ProjectResource;
use PDO;

class ProjectResourceRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(ProjectResource $resource): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO project_resources (project_id, team_id, task_id, title, url, type, description)
            VALUES (:project_id, :team_id, :task_id, :title, :url, :type, :description)
        ");

        $stmt->execute([
            ':project_id' => $resource->projectId,
            ':team_id' => $resource->teamId,
            ':task_id' => $resource->taskId,
            ':title' => $resource->title,
            ':url' => $resource->url,
            ':type' => $resource->type,
            ':description' => $resource->description
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findByProjectId(int $projectId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM project_resources 
            WHERE project_id = :project_id 
            ORDER BY created_at DESC
        ");
        $stmt->execute([':project_id' => $projectId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapRowToResource'], $rows);
    }

    public function findByTaskId(int $taskId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM project_resources 
            WHERE task_id = :task_id 
            ORDER BY created_at DESC
        ");
        $stmt->execute([':task_id' => $taskId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapRowToResource'], $rows);
    }

    public function findByTeamId(int $teamId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM project_resources 
            WHERE team_id = :team_id 
            ORDER BY created_at DESC
        ");
        $stmt->execute([':team_id' => $teamId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapRowToResource'], $rows);
    }

    public function findById(int $id): ?ProjectResource
    {
        $stmt = $this->pdo->prepare("SELECT * FROM project_resources WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row)
            return null;
        return $this->mapRowToResource($row);
    }

    public function update(ProjectResource $resource): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE project_resources 
            SET title = :title, url = :url, type = :type, description = :description, team_id = :team_id, task_id = :task_id
            WHERE id = :id
        ");

        return $stmt->execute([
            ':title' => $resource->title,
            ':url' => $resource->url,
            ':type' => $resource->type,
            ':description' => $resource->description,
            ':team_id' => $resource->teamId,
            ':task_id' => $resource->taskId,
            ':id' => $resource->id
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM project_resources WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    private function mapRowToResource(array $row): ProjectResource
    {
        return new ProjectResource(
            (int) $row['project_id'],
            $row['title'],
            $row['url'],
            $row['type'],
            $row['task_id'] ? (int) $row['task_id'] : null,
            $row['team_id'] ? (int) $row['team_id'] : null,
            (int) $row['id'],
            $row['created_at'],
            $row['description'] ?? null
        );
    }
}
