<?php
require_once __DIR__ . '/../server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\ProjectRepository;
use App\Services\ProjectService;
use App\Repositories\MySQL\CheckpointRepository;

Env::load(__DIR__ . '/../server/.env');

try {
    $projectRepo = new ProjectRepository();
    $checkpointRepo = new CheckpointRepository();
    $projectService = new ProjectService($projectRepo, $checkpointRepo);

    // Test for teacher ID 1 (assuming test@example.com is 1 or similar)
    // Actually let's find the ID for test@example.com
    $userRepo = new \App\Repositories\MySQL\UserRepository();
    $user = $userRepo->findByEmail('test@example.com');
    if (!$user) {
        die("User test@example.com not found\n");
    }

    echo "Testing getProjectsByTeacher for ID: {$user->id}\n";
    $projects = $projectService->getProjectsByTeacher($user->id);
    echo "Found " . count($projects) . " projects\n";
    foreach ($projects as $p) {
        echo "- {$p->title} (ID: {$p->id})\n";
    }
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
