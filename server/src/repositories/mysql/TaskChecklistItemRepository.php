<?php

namespace App\Repositories\MySQL;

use App\Domain\TaskChecklistItem;
use App\Repositories\TaskChecklistItemRepositoryInterface;
use PDO;

class TaskChecklistItemRepository implements TaskChecklistItemRepositoryInterface
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findById(int $id): ?TaskChecklistItem
    {
        $stmt = $this->db->prepare("SELECT * FROM task_checklist_items WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row)
            return null;
        return $this->mapRowToEntity($row);
    }

    public function findByTaskId(int $taskId): array
    {
        $stmt = $this->db->prepare("SELECT * FROM task_checklist_items WHERE task_id = ? ORDER BY sort_order ASC, id ASC");
        $stmt->execute([$taskId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'mapRowToEntity'], $rows);
    }

    public function create(TaskChecklistItem $item): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO task_checklist_items (task_id, content, is_completed, sort_order)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([
            $item->taskId,
            $item->content,
            $item->isCompleted ? 1 : 0,
            $item->sortOrder
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(TaskChecklistItem $item): bool
    {
        $stmt = $this->db->prepare("
            UPDATE task_checklist_items
            SET content = ?, is_completed = ?, sort_order = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $item->content,
            $item->isCompleted ? 1 : 0,
            $item->sortOrder,
            $item->id
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM task_checklist_items WHERE id = ?");
        return $stmt->execute([$id]);
    }

    private function mapRowToEntity(array $row): TaskChecklistItem
    {
        return new TaskChecklistItem(
            (int) $row['task_id'],
            $row['content'],
            (bool) $row['is_completed'],
            (int) $row['sort_order'],
            (int) $row['id'],
            $row['created_at'],
            $row['updated_at']
        );
    }
}
