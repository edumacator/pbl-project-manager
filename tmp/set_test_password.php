<?php
require_once __DIR__ . '/../server/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\UserRepository;

Env::load(__DIR__ . '/../server/.env');

$userRepo = new UserRepository();
$user = $userRepo->findByEmail('test@example.com');

if ($user) {
    $hash = password_hash('password123', PASSWORD_DEFAULT);
    $userRepo->updatePassword($user->id, $hash);
    echo "Password updated for test@example.com\n";
} else {
    echo "User test@example.com not found\n";
}
