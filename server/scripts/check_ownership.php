<?php
require_once __DIR__ . '/../src/autoload.php';
use App\Env;
use App\Repositories\MySQL\Database;

Env::load(__DIR__ . '/../.env');

try {
    $pdo = Database::getConnection();

    $cls = $pdo->query('SELECT id, name, teacher_id FROM classes')->fetchAll(PDO::FETCH_ASSOC);
    echo "Classes:\n";
    print_r($cls);

    $prj = $pdo->query('SELECT id, title, teacher_id FROM projects')->fetchAll(PDO::FETCH_ASSOC);
    echo "Projects:\n";
    print_r($prj);

} catch (Exception $e) {
    die("Query failed: " . $e->getMessage() . "\n");
}
