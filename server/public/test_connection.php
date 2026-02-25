<?php
/**
 * Standalone Database Connection Test
 * Upload this to your 'public/' folder as 'test_db.php'
 * Access it via https://projects.fcsia.com/test_db.php
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h1>Debug Info</h1>";

// 1. Check PHP Version
echo "PHP Version: " . phpversion() . "<br>";

// 2. Check for .env file
$envPath = __DIR__ . '/../.env';
echo "Checking for .env at: " . realpath($envPath) . " ... ";
if (file_exists($envPath)) {
    echo "<strong>FOUND</strong><br>";
} else {
    echo "<strong>MISSING</strong> (Ensure you renamed .env.production to .env)<br>";
}

// 3. Try Loading Env
require_once __DIR__ . '/../src/Env.php';
\App\Env::load($envPath);

echo "DB_HOST: " . (getenv('DB_HOST') ?: 'NOT SET') . "<br>";
echo "DB_NAME: " . (getenv('DB_NAME') ?: 'NOT SET') . "<br>";

// 4. Test Database Connection
echo "<h2>Testing Database Connection...</h2>";
try {
    $host = getenv('DB_HOST');
    $db = getenv('DB_NAME');
    $user = getenv('DB_USER');
    $pass = getenv('DB_PASS');
    $port = getenv('DB_PORT') ?: '3306';

    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "<h3 style='color: green;'>SUCCESS: Connected to database!</h3>";

    // Try a simple query
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables found: " . implode(', ', $tables);

} catch (PDOException $e) {
    echo "<h3 style='color: red;'>FAILURE: " . $e->getMessage() . "</h3>";
}
