<?php

namespace App\Services;

class StudentDashboardService
{
    private $taskRepo;
    private $reviewService;
    private $checkpointService;

    // Deps optional for this direct-SQL version but kept for compatibility if needed
    public function __construct($taskRepo, $reviewService, $checkpointService)
    {
        $this->taskRepo = $taskRepo;
        $this->reviewService = $reviewService;
        $this->checkpointService = $checkpointService;
    }

    public function getDashboard(int $studentId): array
    {
        $pdo = \App\Repositories\MySQL\Database::getConnection();

        // 1. My Projects (Enrolled Projects + Team)
        // Domain Isolation: Only show projects student is enrolled in.
        $projectsStmt = $pdo->prepare("
            SELECT p.id, p.title, t.name as team_name, tm.role
            FROM projects p
            JOIN project_classes pc ON p.id = pc.project_id
            JOIN class_enrollments ce ON pc.class_id = ce.class_id
            LEFT JOIN teams t ON p.id = t.project_id
            LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = :student_id
            WHERE ce.student_id = :student_id_val
            GROUP BY p.id, p.title, t.name, tm.role
        ");
        $projectsStmt->execute([':student_id' => $studentId, ':student_id_val' => $studentId]);
        $myProjects = $projectsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 2. Next Tasks (Priority > Due Date)
        // Domain Isolation: Assignee = Student OR (Team Task AND Team Member)?
        // Let's stick to Assignee for "My Tasks".
        $tasksStmt = $pdo->prepare("
            SELECT t.*, p.title as project_title,
                   (SELECT COUNT(*) FROM task_dependencies td WHERE td.task_id = t.id) as blocker_count
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.assignee_id = :student_id
            AND t.status != 'done'
            ORDER BY 
                FIELD(t.priority, 'high', 'medium', 'low'),
                CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END, 
                t.due_date ASC, 
                t.id ASC
            LIMIT 3
        ");
        $tasksStmt->execute([':student_id' => $studentId]);
        $nextTasks = $tasksStmt->fetchAll(\PDO::FETCH_ASSOC);

        // Stuck Detection
        // If status != 'done' AND updated_at < NOW() - 3 days
        foreach ($nextTasks as &$task) {
            $isStuck = false;
            if ($task['updated_at']) {
                $updated = new \DateTime($task['updated_at']);
                $now = new \DateTime();
                $interval = $now->diff($updated);
                if ($interval->days >= 3) {
                    $isStuck = true;
                }
            }
            $task['is_stuck'] = $isStuck;

            // Blockers
            if ($task['blocker_count'] > 0) {
                $depStmt = $pdo->prepare("
                   SELECT t.title 
                   FROM tasks t
                   JOIN task_dependencies td ON t.id = td.depends_on_id
                   WHERE td.task_id = :task_id
               ");
                $depStmt->execute([':task_id' => $task['id']]);
                $task['blockers'] = $depStmt->fetchAll(\PDO::FETCH_COLUMN); // Array of titles
            } else {
                $task['blockers'] = [];
            }
        }

        // 3. Pending Reviews
        $reviewsStmt = $pdo->prepare("
            SELECT pra.*, u.name as reviewee_name, p.title as project_title, t.title as task_title
            FROM peer_review_assignments pra
            JOIN users u ON pra.reviewee_id = u.id
            JOIN projects p ON pra.project_id = p.id
            LEFT JOIN tasks t ON pra.task_id = t.id
            WHERE pra.reviewer_id = :student_id
            AND pra.status = 'pending'
        ");
        $reviewsStmt->execute([':student_id' => $studentId]);
        $pendingReviews = $reviewsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 3b. Completed Reviews
        $completedReviewsStmt = $pdo->prepare("
            SELECT pra.*, u.name as reviewee_name, p.title as project_title, t.title as task_title
            FROM peer_review_assignments pra
            JOIN users u ON pra.reviewee_id = u.id
            JOIN projects p ON pra.project_id = p.id
            LEFT JOIN tasks t ON pra.task_id = t.id
            WHERE pra.reviewer_id = :student_id
            AND pra.status = 'completed'
            ORDER BY pra.id DESC
            LIMIT 5
        ");
        $completedReviewsStmt->execute([':student_id' => $studentId]);
        $completedReviews = $completedReviewsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 4. Upcoming Checkpoints
        $checkpointsStmt = $pdo->prepare("
            SELECT DISTINCT cp.*, p.title as project_title, 
                   COALESCE(c_direct.name, c_via_proj.name) as class_name
            FROM checkpoints cp
            LEFT JOIN projects p ON cp.project_id = p.id
            LEFT JOIN classes c_direct ON cp.class_id = c_direct.id
            LEFT JOIN project_classes proj_cls ON p.id = proj_cls.project_id
            LEFT JOIN classes c_via_proj ON proj_cls.class_id = c_via_proj.id
            WHERE 
            (
                (cp.class_id IN (
                    SELECT class_id FROM class_enrollments WHERE student_id = :s1
                ))
                OR
                (cp.project_id IN (
                    SELECT pc.project_id 
                    FROM project_classes pc
                    JOIN class_enrollments ce ON pc.class_id = ce.class_id
                    WHERE ce.student_id = :s2
                ))
            )
            AND cp.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 48 HOUR)
            ORDER BY cp.due_date ASC
        ");
        $checkpointsStmt->execute([':s1' => $studentId, ':s2' => $studentId]);
        $upcomingCheckpoints = $checkpointsStmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'my_projects' => $myProjects,
            'next_tasks' => $nextTasks,
            'pending_reviews' => $pendingReviews,
            'completed_reviews' => $completedReviews,
            'upcoming_checkpoints' => $upcomingCheckpoints
        ];
    }
}
