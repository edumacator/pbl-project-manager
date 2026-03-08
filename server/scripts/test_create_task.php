<?php
require 'src/Env.php';
\App\Env::load('.env');
require 'src/autoload.php';

$pdo = \App\Repositories\MySQL\Database::getConnection();
$taskRepo = new \App\Repositories\MySQL\TaskRepository();
$auditRepo = new \App\Repositories\MySQL\AuditLogRepository();
$reflectionRepo = new \App\Repositories\MySQL\TaskReflectionRepository();
$resourceRepo = new \App\Repositories\MySQL\ProjectResourceRepository();
$reviewRepo = new \App\Repositories\MySQL\PeerReviewRepository();
$feedbackRepo = new \App\Repositories\MySQL\FeedbackRepository($pdo);
$projectRepo = new \App\Repositories\MySQL\ProjectRepository();
$reviewService = new \App\Services\ReviewService($reviewRepo, $feedbackRepo, $projectRepo, $taskRepo, $auditRepo);

$taskService = new \App\Services\TaskService($taskRepo, $auditRepo, $reviewService, $reflectionRepo, $resourceRepo);

$taskData = [
    'project_id' => 22,
    'title' => 'Test Default Task',
    'description' => 'Test',
    'team_id' => 1,
    'start_date' => null,
    'assignee_id' => null,
    'dependencies' => []
];

try {
    $task = $taskService->createTask($taskData, 1);
    echo "Task created successfully: ID " . $task->id . "\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
