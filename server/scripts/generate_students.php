<?php
/**
 * Student Generator Script
 * Outputs SQL for 50 fake students.
 */

$firstNames = ['Noah', 'Emma', 'Liam', 'Olivia', 'William', 'Ava', 'James', 'Isabella', 'Oliver', 'Sophia', 'Benjamin', 'Mia', 'Elijah', 'Charlotte', 'Lucas', 'Amelia', 'Mason', 'Evelyn', 'Logan', 'Abigail', 'Alexander', 'Harper', 'Ethan', 'Emily', 'Jacob', 'Elizabeth', 'Michael', 'Avery', 'Daniel', 'Sofia', 'Henry', 'Ella', 'Jackson', 'Madison', 'Sebastian', 'Scarlett', 'Aiden', 'Victoria', 'Matthew', 'Aria', 'Samuel', 'Grace', 'David', 'Chloe', 'Joseph', 'Camila', 'Carter', 'Penelope', 'Owen', 'Riley'];
$lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

$password = 'Innovate2Educate125!';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "--- COPY AND PASTE THIS SQL INTO PHPMYADMIN ---\n\n";
echo "INSERT INTO users (first_name, last_name, name, email, password_hash, role) VALUES\n";

$values = [];
for ($i = 0; $i < 50; $i++) {
    $first = $firstNames[$i % count($firstNames)];
    $last = $lastNames[($i + 7) % count($lastNames)]; // Offset to mix it up
    $name = "$first $last";
    $email = strtolower($last) . "." . strtolower($first) . "@email.com";

    // Add some random variety if names collide
    if (in_array($email, array_column($values, 'email'))) {
        $email = strtolower($last) . "." . strtolower($first) . $i . "@email.com";
    }

    $values[] = "('$first', '$last', '$name', '$email', '$hash', 'student')";
}

echo implode(",\n", $values) . ";\n";
