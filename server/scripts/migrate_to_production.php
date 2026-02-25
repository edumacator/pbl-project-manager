<?php
/**
 * Database Migration Script
 * Transfers all data from Local MySQL to Production MySQL
 */

// --- CONFIGURATION ---
// LOCAL DATABASE (Source)
$localConfig = [
    'host' => 'localhost',
    'db' => 'pbl_project_management',
    'user' => 'root',
    'pass' => '',
    'port' => '3306'
];

// PRODUCTION DATABASE (Destination)
$prodConfig = [
    'host' => 'db5019680021.hosting-data.io',
    'db' => 'dbs15312043',
    'user' => 'dbu4225591',
    'pass' => 'IA-Innovate2Educate125-phoenix',
    'port' => '3306'
];

// TABLES TO MIGRATE (In dependency order)
$tables = [
    'users',
    'classes',
    'projects',
    'class_enrollments',
    'teams',
    'team_members',
    'checkpoints',
    'reflections',
    'tasks',
    'task_attachments',
    'task_dependencies',
    'task_reflections',
    'project_resources',
    'team_resources',
    'peer_review_assignments',
    'peer_reviews',
    'feedback_entries',
    'audit_logs'
];

// --- EXECUTION ---
try {
    echo "Connecting to Local DB: {$localConfig['db']}...\n";
    $localDsn = "mysql:host={$localConfig['host']};port={$localConfig['port']};dbname={$localConfig['db']};charset=utf8mb4";
    $localPdo = new PDO($localDsn, $localConfig['user'], $localConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "SUCCESS: Connected to Local DB.\n\n";

    echo "Connecting to Production DB: {$prodConfig['db']}...\n";
    $prodDsn = "mysql:host={$prodConfig['host']};port={$prodConfig['port']};dbname={$prodConfig['db']};charset=utf8mb4";
    $prodPdo = new PDO($prodDsn, $prodConfig['user'], $prodConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "SUCCESS: Connected to Production DB.\n\n";

    // Start Migration
    echo "Disabling Foreign Key Checks on Production...\n";
    $prodPdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    foreach ($tables as $table) {
        echo "Processing table: [$table]...\n";

        // 1. Get data from local
        $stmt = $localPdo->query("SELECT * FROM `$table` ");
        $rows = $stmt->fetchAll();
        $count = count($rows);

        // 2. Clear production table
        $prodPdo->exec("TRUNCATE TABLE `$table` ");

        echo " - Cleared production table. Found $count rows locally.\n";

        if ($count > 0) {
            // 3. Prepare Batch Insert
            $columns = array_keys($rows[0]);
            $colNames = implode('`, `', $columns);
            $placeholders = implode(', ', array_fill(0, count($columns), '?'));

            $insertSql = "INSERT INTO `$table` (`$colNames`) VALUES ($placeholders)";
            $insertStmt = $prodPdo->prepare($insertSql);

            foreach ($rows as $row) {
                $insertStmt->execute(array_values($row));
            }
            echo " - Migrated $count rows successfully.\n";
        }
    }

    echo "\nRe-enabling Foreign Key Checks...\n";
    $prodPdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    echo "\n============================================\n";
    echo "MIGRATION COMPLETED SUCCESSFULLY!\n";
    echo "============================================\n";

} catch (PDOException $e) {
    echo "\nERROR: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
