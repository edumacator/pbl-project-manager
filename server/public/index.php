<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\ProjectRepository;
use App\Repositories\MySQL\UserRepository;
use App\Repositories\MySQL\TeamRepository;
use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\AuditLogRepository;
use App\Repositories\MySQL\CheckpointRepository;
use App\Repositories\MySQL\ReflectionRepository;
use App\Repositories\MySQL\PeerReviewRepository;
use App\Repositories\MySQL\FeedbackRepository;
use App\Repositories\MySQL\ClassRepository;
use App\Repositories\MySQL\ProjectQnaRepository;
use App\Services\ProjectService;
use App\Services\AuthService;
use App\Services\TeamService;
use App\Services\TaskService;
use App\Services\CheckpointService;
use App\Services\ReviewService;
use App\Services\ClassService;
use App\Services\AnalyticsService;
use App\Services\ProjectQnaService;

// Load Env
Env::load(__DIR__ . '/../.env');

// PHP 8+ Polyfills
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle)
    {
        $length = strlen($needle);
        return $length > 0 ? substr($haystack, -$length) === $needle : true;
    }
}

// ERROR HANDLING (Return JSON for all errors)
set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    if (!(error_reporting() & $errno))
        return;
    throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== NULL && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
        }
        echo json_encode([
            'ok' => false,
            'error' => [
                'code' => 'FATAL_ERROR',
                'message' => $error['message'],
                'file' => $error['file'],
                'line' => $error['line']
            ]
        ]);
    }
});

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($uri !== '/' && strlen($uri) > 1) {
    $uri = rtrim($uri, '/');
}

// Router
if ($uri === '/api/health') {
    echo json_encode(['ok' => true, 'data' => ['status' => 'healthy', 'time' => date('c')]]);
    exit;
}

// Dependency Injection
try {
    $userRepo = new UserRepository();
    $projectRepo = new ProjectRepository();
    $teamRepo = new TeamRepository();
    $taskRepo = new TaskRepository();
    $auditRepo = new AuditLogRepository();
    $checkpointRepo = new CheckpointRepository();
    $reflectionRepo = new ReflectionRepository();
    $reviewRepo = new PeerReviewRepository();
    $classRepo = new ClassRepository();

    $taskReflectionRepo = new \App\Repositories\MySQL\TaskReflectionRepository();
    $resourceRepo = new \App\Repositories\MySQL\ProjectResourceRepository();
    $qnaRepo = new ProjectQnaRepository(\App\Repositories\MySQL\Database::getConnection());

    $reviewService = new ReviewService($reviewRepo, new FeedbackRepository(\App\Repositories\MySQL\Database::getConnection()), $projectRepo, $taskRepo, $auditRepo);
    $authService = new AuthService($userRepo);
    $projectService = new ProjectService($projectRepo, $checkpointRepo);
    $teamService = new TeamService($teamRepo);
    $taskService = new TaskService($taskRepo, $auditRepo, $reviewService, $taskReflectionRepo, $resourceRepo);
    $checkpointService = new CheckpointService($checkpointRepo, $reflectionRepo);
    $classService = new ClassService($classRepo, $userRepo);
    $classService->setProjectService($projectService);
    $studentService = new \App\Services\StudentService($taskRepo, $userRepo);
    $timelineService = new \App\Services\TimelineService($taskRepo, $projectRepo, $teamRepo, $checkpointRepo, $reviewService);
    $analyticsService = new AnalyticsService();
    $qnaService = new ProjectQnaService($qnaRepo);
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => ['code' => 'BOOTSTRAP_ERROR', 'message' => $e->getMessage()]]);
    exit;
}

// Token Extraction
$currentUser = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
    $token = $matches[1];
    $currentUser = $authService->authenticateByToken($token);
}

// Routes

// Auth
if ($uri === '/api/v1/auth/login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $user = $authService->login($input['email'] ?? '', $input['password'] ?? '');
        if ($user) {
            echo json_encode(['ok' => true, 'data' => ['user' => $user]]);
        } else {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'AUTH_FAILED', 'message' => 'Invalid credentials']]);
        }
    } catch (\Throwable $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

if ($uri === '/api/v1/auth/register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $user = $authService->register(
            $input['firstName'] ?? '',
            $input['lastName'] ?? '',
            $input['email'] ?? '',
            $input['password'] ?? '',
            $input['role'] ?? 'student'
        );
        echo json_encode(['ok' => true, 'data' => ['user' => $user]]);
    } catch (\InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Student Password Reset
if (preg_match('#^/api/v1/students/(\d+)/reset-password$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$currentUser || $currentUser->role !== 'teacher') {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Only teachers can reset passwords']]);
        exit;
    }

    $studentId = (int) $matches[1];
    $input = json_decode(file_get_contents('php://input'), true);
    $newPassword = $input['newPassword'] ?? 'student123';

    try {
        $authService->resetStudentPassword($currentUser->id, $studentId, $newPassword);
        echo json_encode(['ok' => true]);
    } catch (\Exception $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Users Search
if ($uri === '/api/v1/users/search' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $query = $_GET['q'] ?? '';
    $role = $_GET['role'] ?? null;
    try {
        $users = $userRepo->search($query, $role);
        echo json_encode(['ok' => true, 'data' => $users]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Projects
if ($uri === '/api/v1/projects' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $result = $projectService->createProject($input);
        echo json_encode(['ok' => true, 'data' => $result]);
    } catch (\InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

if ($uri === '/api/v1/projects' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $classId = isset($_GET['class_id']) ? (int) $_GET['class_id'] : null;
        $includeDeleted = ($_GET['include_deleted'] ?? 'false') === 'true';
        $projects = [];

        if ($classId) {
            $projects = $projectService->getProjectsByClass($classId, $includeDeleted);
        } else if ($currentUser) {
            if ($currentUser->role === 'teacher') {
                $projects = $projectService->getProjectsByTeacher($currentUser->id, $includeDeleted);
            } else if ($currentUser->role === 'student') {
                $projects = $projectService->getProjectsByStudent($currentUser->id, $includeDeleted);
            } else {
                $projects = $projectService->getAllProjects($includeDeleted);
            }
        } else {
            // Fallback for unauthenticated/testing if needed
            $projects = $projectService->getAllProjects($includeDeleted);
        }

        echo json_encode(['ok' => true, 'data' => $projects]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}



if (preg_match('#^/api/v1/projects/(\d+)$#', $uri, $matches)) {
    $projectId = (int) $matches[1];

    // GET Project
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $project = $projectService->getProjectById($projectId);
            if ($project) {
                echo json_encode(['ok' => true, 'data' => ['project' => $project]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Project not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    // Restore Project
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && str_ends_with($uri, '/restore')) {
        try {
            $success = $projectService->restoreProject($projectId);
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['restored' => true]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Project not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    // UPDATE Project
    if ($_SERVER['REQUEST_METHOD'] === 'PATCH' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $project = $projectService->updateProject($projectId, $input);
            if ($project) {
                // Sync Default Tasks to existing teams
                if (isset($input['default_tasks']) && is_array($input['default_tasks'])) {
                    $teams = $teamService->getTeamsByProject($projectId);
                    foreach ($teams as $team) {
                        $existingTasks = $taskService->getTasksByProject($projectId, $team->id);
                        $existingTitles = array_map(fn($t) => $t->title, $existingTasks);

                        foreach ($input['default_tasks'] as $dt) {
                            $title = $dt['title'] ?? 'Default Task';
                            if (!empty(trim($title)) && !in_array($title, $existingTitles)) {
                                $taskData = [
                                    'project_id' => $projectId,
                                    'title' => $title,
                                    'description' => $dt['description'] ?? null,
                                    'team_id' => $team->id,
                                    'assignee_id' => null, // Unassigned
                                    'dependencies' => []
                                ];
                                // 1 = Generic system/teacher user for creation
                                $taskService->createTask($taskData, 1);
                            }
                        }
                    }
                }

                echo json_encode(['ok' => true, 'data' => ['project' => $project]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Project not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    // DELETE Project
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        try {
            $success = $projectService->deleteProject($projectId);
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['deleted' => true]]);
            } else {
                http_response_code(404); // Or 500 if DB failure, but assume 404 if ID bad
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Project not found or could not be deleted']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// ASSIGN Project to Class
if (preg_match('#^/api/v1/projects/(\d+)/assign$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $projectId = (int) $matches[1];
    $input = json_decode(file_get_contents('php://input'), true);
    try {
        $classId = $input['class_id'] ?? null;
        if (!$classId) {
            throw new \InvalidArgumentException("Class ID is required.");
        }
        $success = $projectService->assignProjectToClass($projectId, (int) $classId);
        if ($success) {
            echo json_encode(['ok' => true, 'data' => ['assigned' => true]]);
        } else {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'ASSIGN_FAILED', 'message' => 'Failed to assign project to class']]);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Teams
if (preg_match('#^/api/v1/projects/(\d+)/teams$#', $uri, $matches)) {
    $projectId = (int) $matches[1];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $classId = $input['class_id'] ?? null;
            if (!$classId) {
                throw new \InvalidArgumentException("Class ID is required to create a team.");
            }
            $team = $teamService->createTeam($projectId, (int) $classId, $input['name'] ?? '');

            // Generate default tasks if any
            $project = $projectService->getProjectById($projectId);
            if ($project && !empty($project->defaultTasks)) {
                $teacherId = $project->teacherId ?: clone $classId; // fallback if needed, but we don't strictly require user id for task creation if mock user 1
                $userId = 1; // Generic system/teacher user for creation

                foreach ($project->defaultTasks as $dt) {
                    $taskData = [
                        'project_id' => $projectId,
                        'title' => $dt['title'] ?? 'Default Task',
                        'description' => $dt['description'] ?? null,
                        'team_id' => $team->id,
                        'start_date' => $project->createdAt ? explode(' ', $project->createdAt)[0] : null,
                        'assignee_id' => null, // Unassigned so students can claim
                        'dependencies' => []
                    ];
                    $taskService->createTask($taskData, $userId);
                }
            }

            echo json_encode(['ok' => true, 'data' => ['team' => $team]]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $classId = $_GET['class_id'] ?? null;
            if ($classId) {
                $teams = $teamService->getTeamsByProjectAndClass($projectId, (int) $classId);
            } else {
                $teams = $teamService->getTeamsByProject($projectId);
            }
            echo json_encode(['ok' => true, 'data' => $teams]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Team Members
if (preg_match('#^/api/v1/teams/(\d+)/members$#', $uri, $matches)) {
    $teamId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $userId = $input['user_id'] ?? null;
            if (!$userId) {
                throw new \InvalidArgumentException("User ID is required.");
            }
            $success = $teamService->addMember($teamId, (int) $userId);
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['added' => true]]);
            } else {
                http_response_code(500);
                echo json_encode(['ok' => false, 'error' => ['code' => 'ADD_FAILED', 'message' => 'Failed to add member']]);
            }
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

if (preg_match('#^/api/v1/teams/(\d+)/members/(\d+)$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $teamId = (int) $matches[1];
    $userId = (int) $matches[2];

    try {
        $success = $teamService->removeMember($teamId, $userId);
        if ($success) {
            echo json_encode(['ok' => true, 'data' => ['removed' => true]]);
        } else {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'REMOVE_FAILED', 'message' => 'Failed to remove member']]);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
}

// Team Timeline
if (preg_match('#^/api/v1/teams/(\d+)/timeline$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $teamId = (int) $matches[1];
    try {
        $includeDeleted = isset($_GET['include_deleted']) && ($_GET['include_deleted'] === 'true' || $_GET['include_deleted'] === '1');
        $timeline = $timelineService->getTeamTimeline($teamId, $includeDeleted);
        echo json_encode(['ok' => true, 'data' => $timeline]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Tasks
if (preg_match('#^/api/v1/projects/(\d+)/tasks$#', $uri, $matches)) {
    $projectId = (int) $matches[1];

    // Create Task
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        // Hardcoded user ID = 1 for now (Teacher). In real app, get from Auth token.
        $userId = 1;

        // Inject project_id into input for service
        $input['project_id'] = $projectId;

        try {
            $task = $taskService->createTask($input, $userId);
            echo json_encode(['ok' => true, 'data' => ['task' => $task]]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    // List Tasks
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $teamId = isset($_GET['team_id']) ? (int) $_GET['team_id'] : null;
            $includeDeleted = isset($_GET['include_deleted']) && ($_GET['include_deleted'] === 'true' || $_GET['include_deleted'] === '1');
            $tasks = $taskService->getTasksByProject($projectId, $teamId, $includeDeleted);
            echo json_encode(['ok' => true, 'data' => $tasks]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Update Task
if (preg_match('#^/api/v1/tasks/(\d+)$#', $uri, $matches)) {
    $taskId = (int) $matches[1];
    if ($_SERVER['REQUEST_METHOD'] === 'PATCH' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = 1; // Hardcoded auth

        try {
            $task = $taskService->updateTask($taskId, $input, $userId);
            echo json_encode(['ok' => true, 'data' => ['task' => $task]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        try {
            $success = $taskService->deleteTask($taskId);
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['deleted' => true]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Task not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Restore Task
if (preg_match('#^/api/v1/tasks/(\d+)/restore$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $taskId = (int) $matches[1];
    try {
        $success = $taskService->restoreTask($taskId);
        if ($success) {
            echo json_encode(['ok' => true, 'data' => ['restored' => true]]);
        } else {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Task not found or already active']]);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Task Reflections
if (preg_match('#^/api/v1/tasks/(\d+)/reflections$#', $uri, $matches)) {
    $taskId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = 1; // Hardcoded teacher/student ID for now
        try {
            $reflection = $taskService->addReflection($taskId, $userId, $input['content'] ?? '');
            echo json_encode(['ok' => true, 'data' => ['reflection' => $reflection]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $reflections = $taskService->getReflections($taskId);
            echo json_encode(['ok' => true, 'data' => $reflections]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}


// Task Resources
if (preg_match('#^/api/v1/tasks/(\d+)/resources$#', $uri, $matches)) {
    $taskId = (int) $matches[1];

    // There are actually multiple identical project/resources endpoints in index.php. 
    // Wait, let's fix the task level POST just in case it is requested this way.
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $task = $taskService->getTasksByProject($input['project_id'])[0] ?? null; // not optimal.
            // This endpoint shouldn't be used for POST, frontend posts to projects/:id/resources
        } catch (\Exception $e) {
            http_response_code(500);
        }
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $resources = $taskService->getResourcesForTask($taskId);
            echo json_encode(['ok' => true, 'data' => $resources]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Task Reflections
if (preg_match('#^/api/v1/tasks/(\d+)/reflections$#', $uri, $matches)) {
    $taskId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $reflections = $taskService->getReflections($taskId);
            echo json_encode(['ok' => true, 'data' => $reflections]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['user_id'] ?? 1; // Default user ID if none provided
        $content = $input['content'] ?? '';

        try {
            $reflection = $taskService->addReflection($taskId, $userId, $content);
            echo json_encode(['ok' => true, 'data' => ['reflection' => $reflection]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Project Resources (Duplicate block in index.php)
if (preg_match('#^/api/v1/projects/(\d+)/resources$#', $uri, $matches)) {
    $projectId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $resources = $taskService->getResourcesForProject($projectId);
            echo json_encode(['ok' => true, 'data' => $resources]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $taskId = isset($input['task_id']) ? (int) $input['task_id'] : null;
        $title = $input['title'] ?? '';
        $url = $input['url'] ?? '';
        $type = $input['type'] ?? 'link';
        $teamId = isset($input['team_id']) ? (int) $input['team_id'] : null;
        $description = $input['description'] ?? null;

        try {
            $resource = $taskService->addResource($projectId, $taskId, $title, $url, $type, $teamId, $description);
            echo json_encode(['ok' => true, 'data' => ['resource' => $resource]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Project Resources Upload
if (preg_match('#^/api/v1/projects/(\d+)/resources/upload$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $projectId = (int) $matches[1];

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => ['code' => 'UPLOAD_FAILED', 'message' => 'No file uploaded or upload error']]);
        exit;
    }

    $file = $_FILES['file'];
    $allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'csv'];
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($extension, $allowedExtensions)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_FILE_TYPE', 'message' => 'File type not allowed']]);
        exit;
    }

    // Generate unique filename
    $filename = uniqid('res_') . '_' . preg_replace('/[^a-zA-Z0-9.\-_]/', '', basename($file['name']));
    $uploadDir = __DIR__ . '/uploads/resources/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $targetPath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Helper to cleanly convert JS FormData empty/null/undefined strings to actual PHP nulls
        $cleanId = function ($val) {
            if ($val === null || $val === '' || $val === 'null' || $val === 'undefined')
                return null;
            return (int) $val;
        };

        $taskId = isset($_POST['task_id']) ? $cleanId($_POST['task_id']) : null;
        $title = $_POST['title'] ?? $file['name'];
        $url = '/uploads/resources/' . $filename;
        $type = 'file';
        $teamId = isset($_POST['team_id']) ? $cleanId($_POST['team_id']) : null;
        $description = $_POST['description'] ?? null;

        try {
            $resource = $taskService->addResource($projectId, $taskId, $title, $url, $type, $teamId, $description);
            echo json_encode(['ok' => true, 'data' => ['resource' => $resource]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
    } else {
        $lastError = error_get_last();
        $uploadError = $_FILES['file']['error'] ?? 'Unknown';
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => [
                'code' => 'UPLOAD_FAILED',
                'message' => 'Failed to move uploaded file',
                'details' => $lastError,
                'upload_code' => $uploadError,
                'target_path' => $targetPath,
                'tmp_name' => $file['tmp_name'] ?? null
            ]
        ]);
    }
    exit;
}

// Resource Individual Actions
if (preg_match('#^/api/v1/resources/(\d+)$#', $uri, $matches)) {
    $resourceId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Login required']]);
            exit;
        }

        try {
            $success = $taskService->deleteResource($resourceId);
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['deleted' => true]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Resource not found or already deleted']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PATCH' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Login required']]);
            exit;
        }

        try {
            $resource = $taskService->updateResource($resourceId, $input);
            if ($resource) {
                echo json_encode(['ok' => true, 'data' => ['resource' => $resource]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Resource not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Project Q&A
if (preg_match('#^/api/v1/projects/(\d+)/qna$#', $uri, $matches)) {
    $projectId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $questions = $qnaService->getQuestionsForProject($projectId);
            echo json_encode(['ok' => true, 'data' => $questions]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$currentUser) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Login required']]);
            exit;
        }

        try {
            $question = $input['question'] ?? '';
            $qna = $qnaService->askQuestion($projectId, $currentUser->id, $question);
            echo json_encode(['ok' => true, 'data' => ['qna' => $qna]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

if (preg_match('#^/api/v1/projects/(\d+)/qna/(\d+)$#', $uri, $matches) && ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'PATCH')) {
    $qnaId = (int) $matches[2];
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$currentUser || $currentUser->role !== 'teacher') {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Only teachers can answer questions.']]);
        exit;
    }

    try {
        $answer = $input['answer'] ?? '';
        $success = $qnaService->answerQuestion($qnaId, $currentUser->id, $answer);

        if ($success) {
            echo json_encode(['ok' => true, 'data' => ['answered' => true]]);
        } else {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => 'Failed to save answer.']]);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Team Resources
if (preg_match('#^/api/v1/teams/(\d+)/resources$#', $uri, $matches)) {
    $teamId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $resources = $taskService->getResourcesForTeam($teamId);
            echo json_encode(['ok' => true, 'data' => $resources]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Checkpoints
if (preg_match('#^/api/v1/projects/(\d+)/checkpoints$#', $uri, $matches)) {
    $projectId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $checkpoint = $checkpointService->createCheckpoint($projectId, $input['title'] ?? '', $input['due_date'] ?? null);
            echo json_encode(['ok' => true, 'data' => ['checkpoint' => $checkpoint]]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $checkpoints = $checkpointService->getCheckpointsByProject($projectId);
            echo json_encode(['ok' => true, 'data' => $checkpoints]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Reflections (Create)
if (preg_match('#^/api/v1/checkpoints/(\d+)/reflections$#', $uri, $matches)) {
    $checkpointId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = 2; // Hardcoded student (Alice)

        try {
            $reflection = $checkpointService->submitReflection($userId, $checkpointId, $input);
            echo json_encode(['ok' => true, 'data' => ['reflection' => $reflection]]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $reflections = $checkpointService->getReflectionsForCheckpoint($checkpointId);
            echo json_encode(['ok' => true, 'data' => $reflections]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// FEEDBACK Routes
if (preg_match('/^\/api\/v1\/tasks\/(\d+)\/feedback$/', $uri, $matches)) {
    $taskId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $feedback = $reviewService->getFeedbackForTask($taskId);
        echo json_encode(['ok' => true, 'data' => ['feedback' => $feedback]]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Submit feedback
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => 'Invalid JSON']]);
            exit;
        }

        try {
            // Hardcoded author for now, or from input if we trust it (we shouldn't, but for this stage...)
            // Ideally from session/token. Let's assume input has 'author_id' or we use a default.
            $authorId = $input['author_id'] ?? 1; // Default to 1 if not provided
            $entry = $reviewService->submitFeedback($authorId, $taskId, $input);
            echo json_encode(['ok' => true, 'data' => ['feedback' => $entry]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Peer Reviews
if (preg_match('#^/api/v1/tasks/(\d+)/reviews$#', $uri, $matches)) {
    $taskId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $reviewerId = 2; // Hardcoded student (Alice)
        $revieweeId = 3; // Hardcoded student (Bob)

        try {
            $review = $reviewService->submitReview($reviewerId, $revieweeId, $taskId, $input);
            echo json_encode(['ok' => true, 'data' => ['review' => $review]]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $reviews = $reviewService->getReviewsForTask($taskId);
            echo json_encode(['ok' => true, 'data' => $reviews]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Peer Assignments
if (preg_match('#^/api/v1/projects/(\d+)/assignments$#', $uri, $matches)) {
    $projectId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $assignments = $reviewService->getAssignments($projectId);
            echo json_encode(['ok' => true, 'data' => $assignments]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

if (preg_match('#^/api/v1/projects/(\d+)/assignments/auto$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $projectId = (int) $matches[1];
    try {
        $result = $reviewService->autoAssignReviewers($projectId);
        echo json_encode(['ok' => true, 'data' => ['assignments' => $result, 'count' => count($result)]]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Classes
if ($uri === '/api/v1/classes') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!$currentUser || $currentUser->role !== 'teacher') {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
            exit;
        }
        $teacherId = $currentUser->id;
        $includeDeleted = ($_GET['include_deleted'] ?? 'false') === 'true';
        try {
            $classes = $classService->getClassesByTeacher($teacherId, $includeDeleted);
            echo json_encode(['ok' => true, 'data' => $classes]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!$currentUser || $currentUser->role !== 'teacher') {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        file_put_contents('php://stderr', "Creating class: " . print_r($input, true) . "\n");
        $teacherId = $currentUser->id;
        try {
            $class = $classService->createClass($input['name'] ?? '', $teacherId);
            echo json_encode(['ok' => true, 'data' => ['class' => $class]]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            file_put_contents('php://stderr', "Class creation error (400): " . $e->getMessage() . "\n");
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            file_put_contents('php://stderr', "Class creation error (500): " . $e->getMessage() . "\n");
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

if (preg_match('#^/api/v1/classes/(\d+)$#', $uri, $matches)) {
    $classId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $includeDeleted = ($_GET['include_deleted'] ?? 'false') === 'true';
        try {
            $details = $classService->getClassDetails($classId, $includeDeleted);
            if ($details) {
                echo json_encode(['ok' => true, 'data' => $details]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Class not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    // Restore Class
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && str_ends_with($uri, '/restore')) {
        try {
            $success = $classService->restoreClass($classId);
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['restored' => true]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Class not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $success = $classService->updateClass($classId, $input['name'] ?? '');
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['updated' => true]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Class not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }


    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        try {
            $success = $classService->deleteClass($classId);
            if ($success) {
                echo json_encode(['ok' => true, 'data' => ['deleted' => true]]);
            } else {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Class not found']]);
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Enroll Student in Class
if (preg_match('#^/api/v1/classes/(\d+)/students$#', $uri, $matches)) {
    $classId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $name = $input['name'] ?? ''; // Optional, if creating new user

        if (empty($email)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => 'Email is required']]);
            exit;
        }

        try {
            // Find or Create User
            // We need to access UserRepo here. It was injected into ClassService? Yes.
            // But ClassService doesn't expose findUserByEmail.
            // We can add `enrollStudentByEmail` to ClassService to handle this logic cleanly.
            // Let's call that instead of putting logic in index.php

            $result = $classService->enrollStudentByEmail($classId, $email, $name);

            echo json_encode(['ok' => true, 'data' => ['enrolled' => true, 'student' => $result]]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $students = $classService->getStudents($classId);
            echo json_encode(['ok' => true, 'data' => $students]);
        } catch (\Throwable $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Class Milestones
if (preg_match('#^/api/v1/classes/(\d+)/milestones$#', $uri, $matches)) {
    $classId = (int) $matches[1];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            // Re-use CheckpointService->createCheckpoint?
            // createCheckpoint currently takes projectId. Need to update service too?
            // Or just repository directly if simple? Service is better.
            // Let's check CheckpointService.
            $checkpoint = $checkpointService->createClassCheckpoint($classId, $input['title'] ?? '', $input['due_date'] ?? null);
            echo json_encode(['ok' => true, 'data' => ['checkpoint' => $checkpoint]]);
        } catch (\InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => ['code' => 'INVALID_INPUT', 'message' => $e->getMessage()]]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Student Dashboard
if ($uri === '/api/v1/student/dashboard' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!$currentUser || $currentUser->role !== 'student') {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
        exit;
    }
    $studentId = $currentUser->id;
    try {
        $dashboardService = new \App\Services\StudentDashboardService(null, null, null); // Deps not used in direct SQL version
        $data = $dashboardService->getDashboard($studentId);
        echo json_encode(['ok' => true, 'data' => $data]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Student Project Board Context
if (preg_match('#^/api/v1/projects/(\d+)/team-context$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!$currentUser || $currentUser->role !== 'student') {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
        exit;
    }

    $projectId = (int) $matches[1];
    $userId = $currentUser->id;

    try {
        $service = new \App\Services\ProjectBoardService();
        $data = $service->getTeamContext($projectId, $userId);
        echo json_encode(['ok' => true, 'data' => $data]);
    } catch (\Exception $e) {
        http_response_code($e->getCode() ?: 500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

// Peer Reviews (Assignments)
if (preg_match('#^/api/v1/peer-reviews/(\d+)$#', $uri, $matches)) {
    if (!$currentUser) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
        exit;
    }

    $assignmentId = (int) $matches[1];
    $reviewerId = $currentUser->id;

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            $data = $reviewService->getReviewTargetDetails($assignmentId, $reviewerId);
            echo json_encode(['ok' => true, 'data' => $data]);
        } catch (\Exception $e) {
            http_response_code(403);
            echo json_encode(['ok' => false, 'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

if (preg_match('#^/api/v1/peer-reviews/(\d+)/submit$#', $uri, $matches)) {
    if (!$currentUser) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
        exit;
    }

    $assignmentId = (int) $matches[1];
    $reviewerId = $currentUser->id;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        try {
            $reviewService->submitAssignmentReview($assignmentId, $reviewerId, $input);
            echo json_encode(['ok' => true]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => ['code' => 'ERROR', 'message' => $e->getMessage()]]);
        }
        exit;
    }
}

// Analytics
if ($uri === '/api/v1/analytics/at-risk' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        if (!$currentUser || $currentUser->role !== 'teacher') {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
            exit;
        }
        $teacherId = $currentUser->id;
        $students = $analyticsService->getAtRiskStudents($teacherId);
        echo json_encode(['ok' => true, 'data' => $students]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

if ($uri === '/api/v1/analytics/stuck-teams' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        if (!$currentUser || $currentUser->role !== 'teacher') {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthorized']]);
            exit;
        }
        $teacherId = $currentUser->id;
        $teams = $analyticsService->getStuckTeams($teacherId);
        echo json_encode(['ok' => true, 'data' => $teams]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

if (preg_match('#^/api/v1/teams/(\d+)/contributions$#', $uri, $matches) && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $teamId = (int) $matches[1];
    try {
        $contributions = $analyticsService->getTeamContributions($teamId);
        echo json_encode(['ok' => true, 'data' => $contributions]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => ['code' => 'SERVER_ERROR', 'message' => $e->getMessage()]]);
    }
    exit;
}

http_response_code(404);
file_put_contents('php://stderr', "404 Not Found: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI'] . "\n");
echo json_encode(['ok' => false, 'error' => ['code' => 'NOT_FOUND', 'message' => 'Endpoint not found']]);
