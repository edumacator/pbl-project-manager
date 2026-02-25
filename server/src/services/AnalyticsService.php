<?php

namespace App\Services;

use App\Repositories\MySQL\Database;
use PDO;

class AnalyticsService
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getConnection();
    }

    /**
     * Get students with 1 or more overdue tasks in projects the teacher owns.
     */
    public function getAtRiskStudents(int $teacherId): array
    {
        $sql = "
            SELECT u.id as student_id, u.name, COUNT(t.id) as overdue_count
            FROM users u
            JOIN tasks t ON t.assignee_id = u.id
            JOIN projects p ON t.project_id = p.id
            WHERE p.teacher_id = :teacher_id
              AND t.status != 'done'
              AND t.due_date IS NOT NULL
              AND t.due_date < NOW()
              AND t.deleted_at IS NULL
              AND p.deleted_at IS NULL
            GROUP BY u.id, u.name
            ORDER BY overdue_count DESC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':teacher_id' => $teacherId]);
        return $stmt->fetchAll();
    }

    /**
     * Get teams with overdue tasks OR tasks stuck in 'in_progress' for > 3 days.
     */
    public function getStuckTeams(int $teacherId): array
    {
        $sql = "
            SELECT 
                tm.id as team_id, 
                tm.name as team_name, 
                p.title as project_title,
                p.id as project_id,
                COUNT(CASE 
                    WHEN t.due_date < NOW() 
                         AND t.status != 'done' 
                    THEN 1 END) as overdue_tasks,
                COUNT(CASE 
                    WHEN t.status = 'doing' 
                         AND t.updated_at < DATE_SUB(NOW(), INTERVAL 3 DAY) 
                    THEN 1 END) as stale_tasks
            FROM teams tm
            JOIN projects p ON tm.project_id = p.id
            JOIN tasks t ON t.team_id = tm.id
            WHERE p.teacher_id = :teacher_id
              AND t.deleted_at IS NULL
              AND p.deleted_at IS NULL
            GROUP BY tm.id, tm.name, p.title, p.id
            HAVING overdue_tasks > 0 OR stale_tasks > 0
            ORDER BY (overdue_tasks + stale_tasks) DESC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':teacher_id' => $teacherId]);
        return $stmt->fetchAll();
    }

    /**
     * Get task contribution summary for members of a specific team.
     */
    public function getTeamContributions(int $teamId): array
    {
        $sql = "
            SELECT 
                u.id as user_id, 
                u.name,
                COUNT(t.id) as total_assigned,
                COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN t.status = 'doing' THEN 1 END) as in_progress_tasks
            FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            LEFT JOIN tasks t ON t.assignee_id = u.id AND t.team_id = tm.team_id AND t.deleted_at IS NULL
            WHERE tm.team_id = :team_id
            GROUP BY u.id, u.name
            ORDER BY completed_tasks DESC, total_assigned DESC
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':team_id' => $teamId]);
        return $stmt->fetchAll();
    }
}
