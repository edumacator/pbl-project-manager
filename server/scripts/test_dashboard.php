<?php
require_once __DIR__ . '/../src/Env.php';
\App\Env::load(__DIR__ . '/../.env');
require_once __DIR__ . '/../src/autoload.php';

$dashboardService = new \App\Services\StudentDashboardService(null, null, null);
$studentId = 2; // Let's try student 2 (Alice)
try {
    $data = $dashboardService->getDashboard($studentId);

    echo "--- My Projects ---\n";
    foreach ($data['my_projects'] as $p) {
        echo "{$p['id']}: {$p['title']}\n";
    }

    echo "--- Next Tasks ---\n";
    foreach ($data['next_tasks'] as $t) {
        echo "Task ID {$t['id']}: {$t['title']} (Project: {$t['project_title']})\n";
    }

    echo "--- Upcoming Checkpoints ---\n";
    foreach ($data['upcoming_checkpoints'] as $c) {
        echo "{$c['title']} (Project: {$c['project_title']})\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
