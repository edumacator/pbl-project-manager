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
            AND p.deleted_at IS NULL
            GROUP BY p.id, p.title, t.name, tm.role
        ");
        $projectsStmt->execute([':student_id' => $studentId, ':student_id_val' => $studentId]);
        $myProjects = $projectsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 2. Next Tasks (Priority > Due Date)
        // Domain Isolation: Assignee = Student OR (Team Task AND Team Member)?
        // Let's stick to Assignee for "My Tasks".
        $tasksStmt = $pdo->prepare("
            SELECT t.*, p.title as project_title,
                   (SELECT COUNT(*) FROM task_dependencies td WHERE td.task_id = t.id) as blocker_count,
                   (SELECT COUNT(*) FROM project_resources pr WHERE pr.task_id = t.id) as resource_count,
                   (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id AND st.deleted_at IS NULL) as subtask_count,
                   (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id AND st.status = 'done' AND st.deleted_at IS NULL) as completed_subtask_count
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.assignee_id = :student_id
            AND t.status != 'done'
            AND t.deleted_at IS NULL
            AND p.deleted_at IS NULL
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
        // If status != 'done' AND updated_at < NOW() - 3 days, OR if manually marked stuck
        foreach ($nextTasks as &$task) {
            $isStuck = $task['is_stuck'] ? true : false;

            if (!$isStuck && $task['updated_at']) {
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
            SELECT pra.*, u.name as reviewee_name, p.title as project_title, t.title as task_title, cp.title as checkpoint_title
            FROM peer_review_assignments pra
            JOIN users u ON pra.reviewee_id = u.id
            JOIN projects p ON pra.project_id = p.id
            LEFT JOIN tasks t ON pra.task_id = t.id
            LEFT JOIN checkpoints cp ON pra.checkpoint_id = cp.id
            WHERE pra.reviewer_id = :student_id
            AND pra.status = 'pending'
            AND p.deleted_at IS NULL
        ");
        $reviewsStmt->execute([':student_id' => $studentId]);
        $pendingReviews = $reviewsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 3b. Completed Reviews
        $completedReviewsStmt = $pdo->prepare("
            SELECT pra.*, u.name as reviewee_name, p.title as project_title, t.title as task_title, cp.title as checkpoint_title
            FROM peer_review_assignments pra
            JOIN users u ON pra.reviewee_id = u.id
            JOIN projects p ON pra.project_id = p.id
            LEFT JOIN tasks t ON pra.task_id = t.id
            LEFT JOIN checkpoints cp ON pra.checkpoint_id = cp.id
            WHERE pra.reviewer_id = :student_id
            AND pra.status = 'completed'
            AND p.deleted_at IS NULL
            ORDER BY pra.id DESC
            LIMIT 5
        ");
        $completedReviewsStmt->execute([':student_id' => $studentId]);
        $completedReviews = $completedReviewsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 4. Upcoming Checkpoints
        $checkpointsStmt = $pdo->prepare("
            SELECT cp.id, cp.title, cp.due_date, cp.project_id, p.title as project_title, 
                   MIN(COALESCE(c_direct.name, c_via_proj.name)) as class_name
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
            AND (p.deleted_at IS NULL OR p.id IS NULL)
            AND cp.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 48 HOUR)
            GROUP BY cp.id, cp.title, cp.due_date, cp.project_id, p.title
            ORDER BY cp.due_date ASC
        ");
        $checkpointsStmt->execute([':s1' => $studentId, ':s2' => $studentId]);
        $upcomingCheckpoints = $checkpointsStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 5. Recently Completed Tasks (Last 5)
        $completedTasksStmt = $pdo->prepare("
            SELECT t.*, p.title as project_title,
                   (SELECT COUNT(*) FROM project_resources pr WHERE pr.task_id = t.id) as resource_count,
                   (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id AND st.deleted_at IS NULL) as subtask_count,
                   (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id AND st.status = 'done' AND st.deleted_at IS NULL) as completed_subtask_count
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE t.assignee_id = :student_id
            AND t.status = 'done'
            AND t.deleted_at IS NULL
            AND p.deleted_at IS NULL
            ORDER BY t.updated_at DESC
            LIMIT 5
        ");
        $completedTasksStmt->execute([':student_id' => $studentId]);
        $completedTasks = $completedTasksStmt->fetchAll(\PDO::FETCH_ASSOC);

        // 6. Momentum: Weekly Movement
        // Count tasks moved to 'doing' or 'done' in the last 7 days
        $weeklyStmt = $pdo->prepare("
            SELECT COUNT(DISTINCT details->>'$.task_id') as moved_count
            FROM audit_logs
            WHERE user_id = :student_id
            AND action = 'UPDATE_TASK_STATUS'
            AND (details->>'$.new_status' = 'doing' OR details->>'$.new_status' = 'done')
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ");
        $weeklyStmt->execute([':student_id' => $studentId]);
        $weeklyMovement = (int) ($weeklyStmt->fetchColumn() ?: 0);

        // 7. Momentum: Streak
        // Count consecutive days with at least one task-related action (CREATE_TASK, UPDATE_TASK_STATUS, ADD_REFLECTION, etc.)
        $streakStmt = $pdo->prepare("
            SELECT DISTINCT DATE(created_at) as activity_date
            FROM audit_logs
            WHERE user_id = :student_id
            AND created_at >= DATE_SUB(DATE(NOW()), INTERVAL 30 DAY)
            ORDER BY activity_date DESC
        ");
        $streakStmt->execute([':student_id' => $studentId]);
        $activityDates = $streakStmt->fetchAll(\PDO::FETCH_COLUMN);

        $streak = 0;
        if (!empty($activityDates)) {
            $today = date('Y-m-d');
            $yesterday = date('Y-m-d', strtotime('-1 day'));

            $currentDate = $activityDates[0];

            // If the most recent activity is today or yesterday, start counting
            if ($currentDate === $today || $currentDate === $yesterday) {
                $streak = 1;
                $prevDate = $currentDate;
                for ($i = 1; $i < count($activityDates); $i++) {
                    $expectedDate = date('Y-m-d', strtotime($prevDate . ' -1 day'));
                    if ($activityDates[$i] === $expectedDate) {
                        $streak++;
                        $prevDate = $expectedDate;
                    } else {
                        break;
                    }
                }
            }
        }

        // 8. Upcoming Milestone Review Reminder (if no pending reviews)
        $upcomingMilestoneReview = null;
        if (empty($pendingReviews)) {
            $upcomingMilestoneReviewStmt = $pdo->prepare("
                SELECT cp.title as checkpoint_title, cp.due_date, p.title as project_title, p.id as project_id
                FROM checkpoints cp
                JOIN projects p ON cp.project_id = p.id
                JOIN project_classes pc ON p.id = pc.project_id
                JOIN class_enrollments ce ON pc.class_id = ce.class_id
                WHERE ce.student_id = :student_id
                AND p.require_critique = 1
                AND cp.due_date > NOW()
                AND cp.due_date <= DATE_ADD(NOW(), INTERVAL 7 DAY)
                ORDER BY cp.due_date ASC
                LIMIT 1
            ");
            $upcomingMilestoneReviewStmt->execute([':student_id' => $studentId]);
            $upcomingMilestoneReview = $upcomingMilestoneReviewStmt->fetch(\PDO::FETCH_ASSOC) ?: null;
        }

        // 9. Recent Task Reflections
        $reflectionsStmt = $pdo->prepare("
            SELECT tr.*, t.title as task_title, p.id as project_id, p.title as project_title 
            FROM task_reflections tr
            JOIN tasks t ON tr.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            WHERE tr.user_id = :student_id
            AND p.deleted_at IS NULL
            AND t.deleted_at IS NULL
            ORDER BY tr.created_at DESC
            LIMIT 30
        ");
        $reflectionsStmt->execute([':student_id' => $studentId]);
        $recentReflections = $reflectionsStmt->fetchAll(\PDO::FETCH_ASSOC);

        $groupedReflections = [];
        foreach ($recentReflections as $ref) {
            $taskId = $ref['task_id'];
            if (!isset($groupedReflections[$taskId])) {
                $groupedReflections[$taskId] = [
                    'task_id' => $taskId,
                    'task_title' => $ref['task_title'],
                    'project_id' => $ref['project_id'],
                    'project_title' => $ref['project_title'],
                    'reflections' => []
                ];
            }
            $groupedReflections[$taskId]['reflections'][] = $ref;
        }
        $recentReflectionsList = array_values($groupedReflections);

        return [
            'my_projects' => $myProjects,
            'next_tasks' => $nextTasks,
            'completed_tasks' => $completedTasks,
            'pending_reviews' => $pendingReviews,
            'completed_reviews' => $completedReviews,
            'upcoming_checkpoints' => $upcomingCheckpoints,
            'upcoming_milestone_review' => $upcomingMilestoneReview,
            'recent_reflections' => $recentReflectionsList,
            'momentum' => [
                'weekly' => $weeklyMovement,
                'streak' => $streak
            ]
        ];
    }
}
