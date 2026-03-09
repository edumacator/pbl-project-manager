<?php
/**
 * Verification Script: Task Reflection Logic
 */

require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;
use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\AuditLogRepository;
use App\Repositories\MySQL\TaskReflectionRepository;
use App\Repositories\MySQL\ProjectResourceRepository;
use App\Services\TaskService;
use App\Services\ReviewService;
use App\Repositories\MySQL\PeerReviewRepository;
use App\Repositories\MySQL\FeedbackRepository;
use App\Repositories\MySQL\ProjectRepository;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    // Setup services
    $taskRepo = new TaskRepository();
    $auditRepo = new AuditLogRepository();
    $projectRepo = new ProjectRepository();
    $reviewRepo = new PeerReviewRepository();
    $feedbackRepo = new FeedbackRepository($pdo);
    $reviewService = new ReviewService($reviewRepo, $feedbackRepo, $projectRepo, $taskRepo, $auditRepo);
    $reflectionRepo = new TaskReflectionRepository();
    $resourceRepo = new ProjectResourceRepository();
    $taskService = new TaskService($taskRepo, $auditRepo, $reviewService, $reflectionRepo, $resourceRepo);

    // Fetch a valid task and user
    $taskRow = $pdo->query("SELECT id FROM tasks LIMIT 1")->fetch();
    if (!$taskRow)
        die("No tasks found in DB for testing.\n");
    $taskId = (int) $taskRow['id'];

    $userRow = $pdo->query("SELECT id FROM users LIMIT 1")->fetch();
    if (!$userRow)
        die("No users found in DB for testing.\n");
    $userId = (int) $userRow['id'];

    echo "Using Task ID: $taskId, User ID: $userId\n";

    echo "Testing addReflection with 'start_work'...\n";
    $ref1 = $taskService->addReflection($taskId, $userId, "I will start by researching.", "start_work");
    echo "Created Reflection ID: " . $ref1->id . "\n";
    if ($ref1->transitionType === 'start_work') {
        echo "SUCCESS: transition_type is start_work.\n";
    } else {
        echo "FAILURE: transition_type is " . $ref1->transitionType . "\n";
    }

    echo "Testing addReflection with 'finish_task'...\n";
    $ref2 = $taskService->addReflection($taskId, $userId, "The rubric helped me.", "finish_task");
    echo "Created Reflection ID: " . $ref2->id . "\n";
    if ($ref2->transitionType === 'finish_task') {
        echo "SUCCESS: transition_type is finish_task.\n";
    } else {
        echo "FAILURE: transition_type is " . $ref2->transitionType . "\n";
    }

    echo "Verifying retrieval...\n";
    $reflections = $taskService->getReflections($taskId);
    $found1 = false;
    $found2 = false;
    foreach ($reflections as $r) {
        if ($r->id === $ref1->id && $r->transitionType === 'start_work')
            $found1 = true;
        if ($r->id === $ref2->id && $r->transitionType === 'finish_task')
            $found2 = true;
    }

    if ($found1 && $found2) {
        echo "SUCCESS: All reflections retrieved correctly.\n";
    } else {
        echo "FAILURE: Missing reflections in retrieval.\n";
    }

} catch (Exception $e) {
    die("\nERROR: " . $e->getMessage() . "\n");
}
