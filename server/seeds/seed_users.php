<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\UserRepository;
use App\Domain\User;

Env::load(__DIR__ . '/../.env');

$userRepo = new UserRepository();

echo "Seeding Users...\n";

$users = [
    new User("Mr. Teacher", "teacher@school.org", "teacher"),
    new User("Alice Student", "alice@school.org", "student"),
    new User("Bob Student", "bob@school.org", "student"),
];

foreach ($users as $u) {
    try {
        if ($userRepo->findByEmail($u->email)) {
            echo "Skipping {$u->email} (already exists)\n";
            continue;
        }
        $id = $userRepo->create($u);
        echo "Created user {$u->name} (ID: $id)\n";
    } catch (Exception $e) {
        echo "Error creating {$u->name}: " . $e->getMessage() . "\n";
    }
}

echo "Seeding complete.\n";
