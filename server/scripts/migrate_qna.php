<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;

Env::load(__DIR__ . '/../.env');

$host = getenv('DB_HOST') ?: '127.0.0.1';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$db = getenv('DB_NAME') ?: 'pbl_manager';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "
    CREATE TABLE IF NOT EXISTS project_qna (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        author_id INT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT DEFAULT NULL,
        answered_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    ";

    $pdo->exec($sql);
    echo "Successfully created project_qna table.\n";

    // Also update schema.sql to record this change natively
    $schemaPath = __DIR__ . '/../schema.sql';
    $schema = file_get_contents($schemaPath);
    if (strpos($schema, 'CREATE TABLE IF NOT EXISTS project_qna') === false) {
        $append = "
-- ---------------------------------------------------------
-- Table: project_qna
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_qna (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    author_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT DEFAULT NULL,
    answered_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
";
        // Insert before SET FOREIGN_KEY_CHECKS = 1;
        $schema = str_replace('SET FOREIGN_KEY_CHECKS = 1;', $append . "\nSET FOREIGN_KEY_CHECKS = 1;", $schema);
        file_put_contents($schemaPath, $schema);
        echo "Updated schema.sql.\n";
    }

} catch (PDOException $e) {
    die("Migration failed: " . $e->getMessage() . "\n");
}
