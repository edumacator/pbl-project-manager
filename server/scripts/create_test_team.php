<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\TeamRepository;
use App\Services\TeamService;

// Load .env
Env::load(__DIR__ . '/../.env');

try {
    $teamRepo = new TeamRepository();
    $teamService = new TeamService($teamRepo);

    $projectId = 1;
    $classId = 3;
    $name = "TimelineTest";

    echo "Creating team '$name' for Project $projectId, Class $classId...\n";
    $team = $teamService->createTeam($projectId, $classId, $name);

    echo "Team created with ID: " . $team['id'] . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
