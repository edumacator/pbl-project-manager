<?php
require_once __DIR__ . '/../server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\ProjectRepository;

Env::load(__DIR__ . '/../server/.env');

try {
    $projectRepo = new ProjectRepository();
    // Use ID 59 for test@example.com
    $projects = $projectRepo->findByTeacherId(59);
    echo "Successfully fetched " . count($projects) . " projects for teacher 59\n";
    foreach ($projects as $p) {
        echo "- {$p->title} (ID: {$p->id})\n";
    }
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
