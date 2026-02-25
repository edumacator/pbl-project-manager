<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

// Explicitly load .env from server root
Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    $sql = file_get_contents(__DIR__ . '/016_add_project_description.sql');

    echo "Running 016_add_project_description.sql...\n";
    $pdo->exec($sql);
    echo "Success: 016_add_project_description.sql applied.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}