<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\ProjectRepository;

// Load Env
Env::load(__DIR__ . '/../.env');

$repo = new ProjectRepository();

// Let's assume we are looking at project ID 1 (or we can list all)
$projects = $repo->findAll();

echo "Checking Projects for class_id...\n";
foreach ($projects as $p) {
    echo "Project ID: {$p->id}, Title: {$p->title}\n";
    echo "  Classes: " . json_encode($p->classes) . "\n";
    echo "  Class ID: " . var_export($p->classId, true) . "\n";
    echo "--------------------------------\n";
}
