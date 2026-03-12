<?php
require_once __DIR__ . '/../server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;
use App\Repositories\MySQL\TaskRepository;
use App\Domain\Task;

Env::load(__DIR__ . '/../server/.env');

try {
    $pdo = Database::getConnection();

    // Find a valid project ID
    $stmt = $pdo->query("SELECT id FROM projects LIMIT 1");
    $project = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$project) {
        throw new Exception("No projects found in database. Cannot run test.");
    }
    $projectId = (int) $project['id'];
    echo "Using Project ID: $projectId for testing.\n";

    $repo = new TaskRepository();

    echo "Testing Task Priority Implementation...\n";

    // 1. Create a task with P1
    $task = new Task($projectId, "Priority P1 Test", "Testing P1", "todo");
    $task->priority = 'P1';
    $id = $repo->create($task);
    echo "Created task $id with priority P1\n";

    $savedTask = $repo->findById($id);
    if (!$savedTask) {
        throw new Exception("Failed to find created task $id");
    }
    echo "Saved Task Priority: " . $savedTask->priority . " (Expected: P1)\n";

    if ($savedTask->priority !== 'P1') {
        throw new Exception("Priority mismatch! Expected P1, got " . $savedTask->priority);
    }

    // 2. Update to P2
    $savedTask->priority = 'P2';
    $repo->update($savedTask);
    $updatedTask = $repo->findById($id);
    echo "Updated Task Priority: " . $updatedTask->priority . " (Expected: P2)\n";

    if ($updatedTask->priority !== 'P2') {
        throw new Exception("Priority update mismatch! Expected P2, got " . $updatedTask->priority);
    }

    // 3. Test default (P3)
    $task3 = new Task($projectId, "Priority P3 Test", "Testing P3 Default", "todo");
    $id3 = $repo->create($task3);
    $savedTask3 = $repo->findById($id3);
    echo "Default Task Priority: " . $savedTask3->priority . " (Expected: P3)\n";

    if ($savedTask3->priority !== 'P3') {
        throw new Exception("Default priority mismatch! Expected P3, got " . $savedTask3->priority);
    }

    // Cleanup
    $pdo->exec("DELETE FROM tasks WHERE id IN ($id, $id3)");
    echo "Cleanup: Deleted test tasks.\n";

    echo "\nSUCCESS: Backend priority handling verified.\n";

} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
