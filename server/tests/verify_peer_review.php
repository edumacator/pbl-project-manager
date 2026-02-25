<?php
$url = 'http://localhost:8001/api/v1/tasks/1/reviews';
// Reviewer ID 2 (Alice), Reviewee ID 3 (Bob - assumed), Content, Rating
$data = [
    'reviewer_id' => 2,
    'reviewee_id' => 3,
    'content' => 'Great work on the component!',
    'rating' => 5
];

$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data),
    ],
];
$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
if ($result === FALSE) {
    echo "Error posting review\n";
    print_r(error_get_last());
}

echo $result;
?>