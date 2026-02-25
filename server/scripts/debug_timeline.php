<?php
require_once __DIR__ . '/../src/autoload.php';

use App\Env;

// Load Env
Env::load(__DIR__ . '/../.env');

use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\ProjectRepository;
use App\Repositories\MySQL\TeamRepository;
use App\Repositories\MySQL\CheckpointRepository;
use App\Services\ReviewService;
use App\Services\TimelineService;
use App\Repositories\MySQL\PeerReviewRepository;
use App\Repositories\MySQL\FeedbackRepository;
use App\Repositories\MySQL\AuditLogRepository;

try {
    $taskRepo = new TaskRepository();
    $projectRepo = new ProjectRepository();
    $teamRepo = new TeamRepository();
    $checkpointRepo = new CheckpointRepository();

    // ReviewService dependencies
    $reviewRepo = new PeerReviewRepository();
    $feedbackRepo = new FeedbackRepository(\App\Repositories\MySQL\Database::getConnection());
    $auditRepo = new AuditLogRepository();

    $reviewService = new ReviewService($reviewRepo, $feedbackRepo, $projectRepo, $taskRepo, $auditRepo);

    $service = new TimelineService($taskRepo, $projectRepo, $teamRepo, $checkpointRepo, $reviewService);

    $teams = $teamRepo->findByProjectId(8);
    if (empty($teams)) {
        die("No teams found for project 8\n");
    }
    $teamId = $teams[0]->id;
    echo "Getting timeline for team $teamId...\n";
    $timeline = $service->getTeamTimeline($teamId);
    print_r($timeline);

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
