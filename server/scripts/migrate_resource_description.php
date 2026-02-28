<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();

    echo "Adding description to project_resources...\n";

    $stmt = $pdo->query("SHOW COLUMNS FROM project_resources LIKE 'description'");
    if ($stmt->rowCount() === 0) {
        $pdo->exec("
            ALTER TABLE project_resources 
            ADD COLUMN description TEXT NULL AFTER title;
        ");
        echo "Added 'description' to 'project_resources' table.\n";
    } else {
        echo "'description' already exists in 'project_resources' table.\n";
    }

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    die("Migration failed: " . $e->getMessage() . "\n");
}
