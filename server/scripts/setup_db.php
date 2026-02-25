<?php

require_once __DIR__ . '/../src/autoload.php';
use App\Env;

// Explicitly load .env from server root
Env::load(__DIR__ . '/../.env');

$host = getenv('DB_HOST');
$port = getenv('DB_PORT');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');
$dbname = getenv('DB_NAME');

echo "Attempting connection to $host:$port as $user with password...\n";

try {
    // Connect without DB name to create it
    $dsn = "mysql:host=$host;port=$port";
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Connected successfully to MySQL server.\n";

    $dbnameClean = str_replace(['`', ';'], '', $dbname);

    echo "Creating database '$dbnameClean' if it doesn't exist...\n";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbnameClean` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    echo "Database created/verified.\n";

} catch (PDOException $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}
