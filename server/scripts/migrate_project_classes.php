<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Migrating Project-Class relationship...\n";

    // 1. Create project_classes lookup table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS project_classes (
            project_id INT NOT NULL,
            class_id INT NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (project_id, class_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");
    echo "Created 'project_classes' table.\n";

    // 2. Migrate existing data
    // If we have projects with class_id, move them to the new table
    $stmt = $pdo->query("SELECT id, class_id FROM projects WHERE class_id IS NOT NULL");
    $projects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($projects as $project) {
        $pdo->prepare("INSERT IGNORE INTO project_classes (project_id, class_id) VALUES (?, ?)")
            ->execute([$project['id'], $project['class_id']]);
        echo "Migrated Project {$project['id']} to Class {$project['class_id']}\n";
    }

    // 3. Remove class_id from projects table
    // We'll keep it as a nullable column for now to avoid breaking running code immediately, 
    // but semantically we stop using it. 
    // Actually, I'll drop the FK constraint to allow flexibility.

    // Check for constraint name usually 'projects_ibfk_2' or similar, but defined as 'fk_project_class' in previous migration
    try {
        $pdo->exec("ALTER TABLE projects DROP FOREIGN KEY fk_project_class");
        echo "Dropped FK 'fk_project_class' from 'projects'.\n";
    } catch (Exception $e) {
        echo "FK constraint might not exist or verify name: " . $e->getMessage() . "\n";
    }

    try {
        $pdo->exec("ALTER TABLE projects DROP COLUMN class_id");
        echo "Dropped 'class_id' column from 'projects'.\n";
    } catch (Exception $e) {
        echo "Column 'class_id' might not exist: " . $e->getMessage() . "\n";
    }

    echo "Refactor migration completed.\n";

} catch (Exception $e) {
    die("Migration failed: " . $e->getMessage() . "\n");
}
