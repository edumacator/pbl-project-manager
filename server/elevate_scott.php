<?php
require_once __DIR__ . '/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/.env');

try {
    $db = Database::getConnection();
    $stmt = $db->prepare("UPDATE users SET role = 'admin' WHERE id = 57");
    $stmt->execute();
    echo "Successfully updated user 54 to admin role.\n";

    $stmt = $db->query("SELECT id, name, role FROM users WHERE id = 57");
    var_dump($stmt->fetch(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo $e->getMessage();
}
