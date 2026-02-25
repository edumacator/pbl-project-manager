<?php

namespace App\Repositories\MySQL;

use App\Domain\Task;
use App\Repositories\TaskRepositoryInterface;
use PDO;

class TaskRepository implements TaskRepositoryInterface
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    public function create(Task $task): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO tasks (project_id, title, description, status, assignee_id, team_id, due_date, dependencies, start_date, duration_days, end_date)
            VALUES (:project_id, :title, :description, :status, :assignee_id, :team_id, :due_date, :dependencies, :start_date, :duration_days, :end_date)
        ");

        $stmt->execute([
            ':project_id' => $task->projectId,
            ':title' => $task->title,
            ':description' => $task->description,
            ':status' => $task->status,
            ':assignee_id' => $task->assigneeId,
            ':team_id' => $task->teamId,
            ':due_date' => $task->dueDate,
            ':dependencies' => $task->dependencies ? json_encode($task->dependencies) : null,
            ':start_date' => $task->startDate ?? null,
            ':duration_days' => $task->durationDays ?? 1,
            ':end_date' => $task->endDate ?? null
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function findById(int $id): ?Task
    {
        $stmt = $this->pdo->prepare("SELECT * FROM tasks WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->mapRowToTask($row) : null;
    }

    public function findByProjectId(int $projectId, ?int $teamId = null, bool $includeDeleted = false): array
    {
        $sql = "
            SELECT t.*, u.name as assignee_name
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.project_id = :project_id
        ";
        $params = [':project_id' => $projectId];

        if ($teamId) {
            $sql .= " AND t.team_id = :team_id";
            $params[':team_id'] = $teamId;
        }

        if (!$includeDeleted) {
            $sql .= " AND t.deleted_at IS NULL";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return array_map([$this, 'mapRowToTask'], $rows);
    }

    public function update(Task $task): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE tasks 
            SET title = :title, description = :description, status = :status, assignee_id = :assignee_id, team_id = :team_id, due_date = :due_date, dependencies = :dependencies, start_date = :start_date, duration_days = :duration_days, priority = :priority, end_date = :end_date, deleted_at = :deleted_at
            WHERE id = :id
        ");

        return $stmt->execute([
            ':title' => $task->title,
            ':description' => $task->description,
            ':status' => $task->status,
            ':assignee_id' => $task->assigneeId,
            ':team_id' => $task->teamId,
            ':due_date' => $task->dueDate,
            ':dependencies' => $task->dependencies,
            ':start_date' => $task->startDate ?? null,
            ':duration_days' => $task->durationDays ?? 1,
            ':priority' => $task->priority,
            ':end_date' => $task->endDate ?? null,
            ':deleted_at' => $task->deletedAt ?? null,
            ':id' => $task->id
        ]);
    }

    private function mapRowToTask(array $row): Task
    {
        return new Task(
            (int) $row['project_id'],
            $row['title'],
            $row['description'] ?? null,
            $row['status'],
            $row['assignee_id'] ? (int) $row['assignee_id'] : null,
            $row['team_id'] ? (int) $row['team_id'] : null,
            (int) $row['id'],
            $row['due_date'],
            $row['dependencies'] ? json_decode($row['dependencies'], true) : [],
            $row['start_date'] ?? null,
            $row['duration_days'] ? (int) $row['duration_days'] : 1,
            $row['priority'] ?? 'medium',
            $row['updated_at'] ?? null,
            $row['assignee_name'] ?? null,
            $row['created_at'] ?? null,
            $row['end_date'] ?? null,
            $row['deleted_at'] ?? null
        );
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE tasks SET deleted_at = NOW() WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function restore(int $id): bool
    {
        $stmt = $this->pdo->prepare("UPDATE tasks SET deleted_at = NULL WHERE id = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function addDependency(int $taskId, int $dependsOnId): bool
    {
        $stmt = $this->pdo->prepare("
            INSERT IGNORE INTO task_dependencies (task_id, depends_on_id)
            VALUES (:task_id, :depends_on_id)
        ");
        return $stmt->execute([':task_id' => $taskId, ':depends_on_id' => $dependsOnId]);
    }

    public function removeDependency(int $taskId, int $dependsOnId): bool
    {
        $stmt = $this->pdo->prepare("
            DELETE FROM task_dependencies 
            WHERE task_id = :task_id AND depends_on_id = :depends_on_id
        ");
        return $stmt->execute([':task_id' => $taskId, ':depends_on_id' => $dependsOnId]);
    }

    public function getDependencies(int $taskId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT depends_on_id 
            FROM task_dependencies 
            WHERE task_id = :task_id
        ");
        $stmt->execute([':task_id' => $taskId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function findAllOverdue(): array
    {
        // Find tasks status != done and due_date < now
        $stmt = $this->pdo->query("
            SELECT t.*, u.name as assignee_name 
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.status != 'done' 
            AND t.due_date IS NOT NULL 
            AND t.due_date < NOW()
        ");
        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }
}
