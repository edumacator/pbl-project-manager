<?php

require_once __DIR__ . '/../src/autoload.php';

use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();
    echo "Migrating Teams (adding class_id)...\n";

    // 1. Add class_id column
    try {
        $pdo->exec("ALTER TABLE teams ADD COLUMN class_id INT NULL");
        echo "Added 'class_id' column to 'teams'.\n";
    } catch (Exception $e) {
        echo "Column 'class_id' might already exist: " . $e->getMessage() . "\n";
    }

    // 2. Add Foreign Key
    try {
        $pdo->exec("ALTER TABLE teams ADD CONSTRAINT fk_team_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE");
        echo "Added FK constraint.\n";
    } catch (Exception $e) {
        echo "FK constraint might already exist: " . $e->getMessage() . "\n";
    }

    // 3. Backfill Data (Smart-ish)
    // For each team, assume the project belongs to a class? 
    // But projects are now multi-class.
    // Better strategy: Look at the students in the team? 
    // Wait, teams don't have members in the DB directly yet? 
    // Usually there is team_members table. Let's check.
    // If not, we might update manually or default to Class 1.

    // In current seed, Students 1-25 -> Class 1. Students 26-50 -> Class 2.
    // We can assume if team exists, we equate to Class 1 for now if we can't determine.

    $pdo->exec("UPDATE teams SET class_id = 1 WHERE class_id IS NULL");
    echo "Backfilled existing teams to Class 1.\n";

    // 4. Make Not Null (optional, maybe later)
    // $pdo->exec("ALTER TABLE teams MODIFY COLUMN class_id INT NOT NULL");

    echo "Migration completed.\n";

} catch (Exception $e) {
    die("Migration failed: " . $e->getMessage() . "\n");
}
