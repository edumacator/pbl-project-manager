<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

// Load Env
Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();

    // Add due_date
    echo "Adding due_date column...\n";
    try {
        $pdo->exec("ALTER TABLE tasks ADD COLUMN due_date DATETIME NULL");
        echo "due_date column added.\n";
    } catch (PDOException $e) {
        echo "due_date column might already exist: " . $e->getMessage() . "\n";
    }

    // Add dependencies
    echo "Adding dependencies column...\n";
    try {
        $pdo->exec("ALTER TABLE tasks ADD COLUMN dependencies JSON NULL");
        echo "dependencies column added.\n";
    } catch (PDOException $e) {
        echo "dependencies column might already exist: " . $e->getMessage() . "\n";
    }

    echo "Migration complete.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
