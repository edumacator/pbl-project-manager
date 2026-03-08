<?php
require 'src/Env.php';
\App\Env::load('.env');
require 'src/autoload.php';

$projectRepo = new \App\Repositories\MySQL\ProjectRepository();
$projectService = new \App\Services\ProjectService($projectRepo, new \App\Repositories\MySQL\CheckpointRepository());

$project = $projectService->getProjectById(22);
if ($project) {
    echo "Project Title: " . $project->title . "\n";
    echo "Default Tasks: ";
    print_r($project->defaultTasks);
} else {
    echo "Project 22 not found.\n";
}
