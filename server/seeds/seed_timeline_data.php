<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\ProjectRepository;
use App\Repositories\MySQL\ClassRepository;
use App\Repositories\MySQL\TeamRepository;
use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\UserRepository;
use App\Repositories\MySQL\CheckpointRepository;
use App\Services\ProjectService;
use App\Services\ClassService;
use App\Services\TeamService;
use App\Services\TaskService;
use App\Services\CheckpointService; // If needed, or just allow null

// Load .env
Env::load(__DIR__ . '/../.env');

try {
    // Repos
    $userRepo = new UserRepository();
    $projectRepo = new ProjectRepository();
    $classRepo = new ClassRepository();
    $teamRepo = new TeamRepository();
    $taskRepo = new TaskRepository();
    $checkpointRepo = new CheckpointRepository();

    // Services
    $projectService = new ProjectService($projectRepo);
    $classService = new ClassService($classRepo, $userRepo);
    $teamService = new TeamService($teamRepo);
    // TaskService dependency injection is tricky with AuditLogRepo, try direct repo usage or mock
    // $taskService = new TaskService($taskRepo, ...); 

    // 1. Ensure Teacher Exists
    $teacher = $userRepo->findByEmail('teacher@example.com');
    if (!$teacher) {
        $teacherUser = new \App\Domain\User('Teacher', 'teacher@example.com', 'teacher');
        $teacherId = $userRepo->create($teacherUser);
        echo "Created Teacher ID: $teacherId\n";
    } else {
        $teacherId = $teacher->id;
        echo "Found Teacher ID: $teacherId\n";
    }

    // 2. Create Project
    $projectData = [
        'title' => 'Timeline Project',
        'driving_question' => 'How long does it take?',
        'description' => 'Testing timeline',
        'teacher_id' => $teacherId,
        'due_date' => date('Y-m-d', strtotime('+30 days'))
    ];
    // Check if project exists? Simple way: just create new one
    $projectId = $projectRepo->create(new \App\Domain\Project(
        $projectData['title'],
        $projectData['driving_question'],
        $projectData['description'],
        $projectData['teacher_id'],
        $projectData['due_date']
    ));
    echo "Created Project ID: $projectId\n";

    // 3. Create Checkpoint (Milestone)
    $checkpointRepo->create(new \App\Domain\Checkpoint(
        $projectId,
        'Mid-way Milestone',
        date('Y-m-d', strtotime('+15 days')),
        null,
        true // isHardDeadline
    ));

    // 4. Create Class
    $classEntity = new \App\Domain\ClassEntity('Timeline Class', $teacherId);
    $classId = $classRepo->create($classEntity);
    echo "Created Class ID: $classId\n";

    // 5. Assign Project to Class
    $projectRepo->assignToClass($projectId, $classId);

    // 6. Create Team
    $team = $teamService->createTeam($projectId, $classId, 'Timeline Team');
    $teamId = $team->id;
    echo "Created Team ID: $teamId\n";

    // 7. Create Tasks with Dependencies
    // - Task 1: Start today, duration 3 days
    $task1 = new \App\Domain\Task(
        $projectId,
        'Research',
        'Gather info',
        'done',
        null,
        $teamId,
        null, // id
        null, // due_date
        [],
        date('Y-m-d'), // start_date
        3 // duration
    );
    $task1Id = $taskRepo->create($task1);
    echo "Created Task 1 ID: $task1Id\n";

    // - Task 2: Start +4 days, duration 2 days, depends on Task 1
    $task2 = new \App\Domain\Task(
        $projectId,
        'Drafting',
        'Write draft',
        'todo',
        null,
        $teamId,
        null,
        null,
        [$task1Id], // dependencies (this just sets the JSON field, doesn't add rows to header table yet?)
        // TaskRepository create() handles dependencies json encoding, but addDependency handles foreign keys?
        // My TaskRepository implementation for create() inserts into tasks table.
        // It does NOT insert into task_dependencies table automatically in `create`.
        // I need to call `addDependency` manually if I want the relation table populated.
        date('Y-m-d', strtotime('+4 days')),
        2
    );
    $task2Id = $taskRepo->create($task2);
    $taskRepo->addDependency($task2Id, $task1Id);

    echo "Created Task 2 ID: $task2Id (depends on $task1Id)\n";

    echo "Seed Verified.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
