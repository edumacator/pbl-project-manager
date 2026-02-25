<?php
$url = 'http://localhost:8001/api/v1/projects';
$data = ['title' => 'QA Project', 'driving_question' => 'How to QA?'];

$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data),
    ],
];
$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
if ($result === FALSE) { /* Handle error */
}

echo $result;
?>