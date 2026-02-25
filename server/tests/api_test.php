<?php

function test($method, $url, $data = null)
{
    echo "Testing $method $url ...\n";

    $opts = [
        'http' => [
            'method' => $method,
            'header' => "Content-Type: application/json\r\n",
            'ignore_errors' => true
        ]
    ];

    if ($data) {
        $opts['http']['content'] = json_encode($data);
    }

    $context = stream_context_create($opts);
    $result = file_get_contents($url, false, $context);

    echo "Response: $result\n\n";
    return json_decode($result, true);
}

$baseUrl = 'http://localhost:8001/api/v1';

// 1. Login
test('POST', "$baseUrl/auth/login", ['email' => 'teacher@school.org', 'password' => 'any']);

// 2. Create Project
$p = test('POST', "$baseUrl/projects", [
    'title' => 'Test Project via Script',
    'driving_question' => 'Does this work?',
    'teacher_id' => 1
]);

$pid = $p['data']['project']['id'] ?? 1;

// 3. Create Team
test('POST', "$baseUrl/projects/$pid/teams", ['name' => 'Script Team']);

// 4. List Teams
test('GET', "$baseUrl/projects/$pid/teams");

// 5. Create Task
$t = test('POST', "$baseUrl/projects/$pid/tasks", [
    'title' => 'Design Database Schema',
    'description' => 'Use MySQL',
    'assignee_id' => 2
]);
$tid = $t['data']['task']['id'] ?? 1;

// 6. Update Task
test('PATCH', "$baseUrl/tasks/$tid", [
    'status' => 'doing'
]);

// 7. List Tasks
test('GET', "$baseUrl/projects/$pid/tasks");

// 8. Create Checkpoint
$cp = test('POST', "$baseUrl/projects/$pid/checkpoints", [
    'title' => 'Alpha Review',
    'due_date' => '2023-12-31 23:59:59'
]);
$cpid = $cp['data']['checkpoint']['id'] ?? 1;

// 9. Submit Reflection
test('POST', "$baseUrl/checkpoints/$cpid/reflections", [
    'type' => 'process',
    'content' => 'I learned a lot about PHP.'
]);

// 10. List Reflections
test('GET', "$baseUrl/checkpoints/$cpid/reflections");

// 11. Submit Peer Review (Alice reviews Bob on Task 1)
test('POST', "$baseUrl/tasks/1/reviews", [
    'content' => 'Great work on the DB schema!',
    'rating' => 5
]);

// 12. List Reviews for Task
test('GET', "$baseUrl/tasks/1/reviews");



