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

    $sql = file_get_contents(__DIR__ . '/../migrations/029_team_resources.sql');
    if ($sql === false) {
        throw new Exception("Could not read migration file.");
    }

    $statements = array_filter(array_map('trim', explode(';', $sql)));

    foreach ($statements as $statement) {
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }

    echo "Migration 029 executed successfully.\n";

} catch (PDOException $e) {
    if ($e->getCode() == '42SC7') {
        echo "Migration 029 skipped: column already exists.\n";
    } else {
        die("Database Error: " . $e->getMessage() . "\n");
    }
} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}
