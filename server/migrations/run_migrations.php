<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

// Load .env
Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database.\n";

    $files = glob(__DIR__ . '/*.sql');
    sort($files);

    foreach ($files as $file) {
        $filename = basename($file);
        echo "Running $filename...\n";

        $sql = file_get_contents($file);
        if (trim($sql) === '') {
            echo "Skipping empty file $filename\n";
            continue;
        }

        try {
            $pdo->exec($sql);
            echo "Success: $filename\n";
        } catch (PDOException $e) {
            echo "Error running $filename: " . $e->getMessage() . "\n";
            exit(1);
        }
    }

    echo "Migrations complete.\n";
} catch (Exception $e) {
    echo "Connection Error: " . $e->getMessage() . "\n";
    echo "Ensure your database exists and credentials are correct.\n";
    exit(1);
}
