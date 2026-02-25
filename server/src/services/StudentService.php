<?php

namespace App\Services;

use App\Repositories\TaskRepositoryInterface;
use App\Repositories\MySQL\UserRepository;

class StudentService
{
    private TaskRepositoryInterface $taskRepo;
    private UserRepository $userRepo;

    public function __construct(TaskRepositoryInterface $taskRepo, UserRepository $userRepo)
    {
        $this->taskRepo = $taskRepo;
        $this->userRepo = $userRepo;
    }

    public function getAtRiskStudents(int $teacherId, ?int $classId = null, ?int $projectId = null): array
    {
        $overdueTasks = $this->taskRepo->findAllOverdue();
        $atRisk = [];
        foreach ($overdueTasks as $task) {
            $uid = $task['assignee_id'] ?? 0;
            if (!$uid)
                continue;

            if (!isset($atRisk[$uid])) {
                $atRisk[$uid] = [
                    'student_id' => $uid,
                    'name' => 'Student ' . $uid,
                    'overdue_count' => 0,
                    'project_id' => $task['project_id']
                ];
            }
            $atRisk[$uid]['overdue_count']++;
        }
        return array_values($atRisk);
    }

    public function getDashboardData(int $studentId): array
    {
        $pdo = \App\Repositories\MySQL\Database::getConnection();

        // Projects
        $stmt = $pdo->prepare("
            SELECT p.*, c.name as class_name
            FROM projects p
            JOIN classes c ON p.class_id = c.id
            JOIN class_enrollments ce ON c.id = ce.class_id
            WHERE ce.student_id = :student_id
        ");
        $stmt->execute([':student_id' => $studentId]);
        $projects = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Teams
        $stmt = $pdo->prepare("
            SELECT t.*
            FROM teams t
            JOIN team_members tm ON t.id = tm.team_id
            WHERE tm.user_id = :student_id
        ");
        $stmt->execute([':student_id' => $studentId]);
        $teams = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Tasks
        $stmt = $pdo->prepare("
            SELECT t.*, p.title as project_title, te.name as team_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN teams te ON t.team_id = te.id
            WHERE t.assignee_id = :student_id
        ");
        $stmt->execute([':student_id' => $studentId]);
        $tasks = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Orphan Check
        $orphanProjects = [];
        $teamProjectIds = array_column($teams, 'project_id');
        foreach ($projects as $p) {
            if (!in_array($p['id'], $teamProjectIds)) {
                $orphanProjects[] = $p;
            }
        }

        return [
            'projects' => $projects,
            'teams' => $teams,
            'tasks' => $tasks,
            'orphan_projects' => $orphanProjects
        ];
    }
}
