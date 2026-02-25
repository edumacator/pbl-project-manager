<?php
/**
 * Schema Repair Script
 * Syncs the production database with the latest application requirements.
 */

// 1. Path Detection
$baseDir = __DIR__;
if (!file_exists($baseDir . '/.env')) {
    $baseDir = dirname(__DIR__); // Try one level up if run from public/
}

require_once $baseDir . '/src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

// 2. Load Environment
Env::load($baseDir . '/.env');

try {
    $pdo = Database::getConnection();
    echo "Connected to database: " . getenv('DB_NAME') . "\n\n";

    // --- REPAIR TASKS TABLE ---
    echo "Checking 'tasks' table...\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM tasks");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('due_date', $columns)) {
        echo " - Adding 'due_date' column to tasks...\n";
        $pdo->exec("ALTER TABLE tasks ADD COLUMN due_date DATETIME DEFAULT NULL AFTER team_id");
    }

    if (!in_array('dependencies', $columns)) {
        echo " - Adding 'dependencies' column to tasks...\n";
        $pdo->exec("ALTER TABLE tasks ADD COLUMN dependencies JSON NULL AFTER priority");
    }

    if (!in_array('updated_at', $columns)) {
        echo " - Adding 'updated_at' column to tasks...\n";
        $pdo->exec("ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
    }
    echo "SUCCESS: 'tasks' table is up to date.\n\n";

    // --- REPAIR TEAMS TABLE ---
    echo "Checking 'teams' table...\n";
    $stmt = $pdo->query("SHOW COLUMNS FROM teams");
    $tColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('class_id', $tColumns)) {
        echo " - Adding 'class_id' column to teams...\n";
        $pdo->exec("ALTER TABLE teams ADD COLUMN class_id INT NOT NULL AFTER project_id");
        $pdo->exec("ALTER TABLE teams ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE");
    }
    echo "SUCCESS: 'teams' table is up to date.\n\n";

    // --- REPAIR OTHER TABLES ---
    $tables = [
        'class_enrollments' => "CREATE TABLE IF NOT EXISTS class_enrollments (id INT AUTO_INCREMENT PRIMARY KEY, class_id INT NOT NULL, student_id INT NOT NULL, enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE, FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE KEY unique_enrollment (class_id, student_id))",
        'project_classes' => "CREATE TABLE IF NOT EXISTS project_classes (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, class_id INT NOT NULL, assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE, UNIQUE KEY unique_assignment (project_id, class_id))",
        'feedback_entries' => "CREATE TABLE IF NOT EXISTS feedback_entries (id INT AUTO_INCREMENT PRIMARY KEY, task_id INT NOT NULL, author_id INT NOT NULL, warm_feedback TEXT, cool_feedback TEXT, requires_revision TINYINT(1) DEFAULT 0, checklist_confirmed TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE)",
        'peer_review_assignments' => "CREATE TABLE IF NOT EXISTS peer_review_assignments (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, reviewer_id INT NOT NULL, reviewee_id INT NOT NULL, task_id INT, status ENUM('pending', 'completed') DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL)",
        'task_reflections' => "CREATE TABLE IF NOT EXISTS task_reflections (id INT AUTO_INCREMENT PRIMARY KEY, task_id INT NOT NULL, user_id INT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
        'project_resources' => "CREATE TABLE IF NOT EXISTS project_resources (id INT AUTO_INCREMENT PRIMARY KEY, project_id INT NOT NULL, task_id INT, team_id INT, title VARCHAR(255) NOT NULL, url TEXT NOT NULL, type ENUM('link', 'file', 'image', 'video') DEFAULT 'link', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL, FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL)"
    ];

    foreach ($tables as $name => $sql) {
        echo "Verifying '$name' table...\n";
        $pdo->exec($sql);
        echo "SUCCESS: '$name' is ready.\n\n";
    }

    echo "============================================\n";
    echo "SCHEMA REPAIR COMPLETED SUCCESSFULLY!\n";
    echo "============================================\n";

} catch (Exception $e) {
    die("\nERROR: " . $e->getMessage() . "\n");
}
