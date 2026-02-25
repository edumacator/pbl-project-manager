<?php
/**
 * Heuristic Contract Audit Script
 * 
 * This script scans for potential contract changes.
 * In a real environment, this would diff ASTs or use a snapshot system.
 */

echo "--- Contract Audit Report ---\n";

// Example heuristic: Check for changes in schema.sql or migrations
$schemaFile = __DIR__ . '/../../../../server/db/schema.sql'; // Adjusted for skills structure
if (file_exists($schemaFile)) {
    echo "[INFO] Scanning DB Schema: $schemaFile\n";
}

// Logic to detect changed files via git (if available)
exec("git diff --name-only main", $changedFiles);

if (empty($changedFiles)) {
    echo "[OK] No changes detected against main.\n";
} else {
    echo "[!] Changed Files Detected:\n";
    foreach ($changedFiles as $file) {
        $risk = "Low";
        if (str_contains($file, 'Repository') || str_contains($file, 'Controller')) {
            $risk = "HIGH (Contract Surface)";
        } elseif (str_contains($file, 'schema.sql') || str_contains($file, 'migrate')) {
            $risk = "CRITICAL (Database)";
        }
        echo "  - $file [$risk]\n";
    }
}

echo "--- End of Report ---\n";
