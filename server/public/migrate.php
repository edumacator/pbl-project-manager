<?php

// Interactive Migration UI Runner
// Execute via Browser: https://domain.com/migrate.php?secret=YOUR_SECRET

require_once __DIR__ . '/../src/autoload.php';

use App\Repositories\MySQL\Database;

App\Env::load(__DIR__ . '/../.env');

$secret = $_GET['secret'] ?? '';
$envSecret = $_ENV['MIGRATION_SECRET'] ?? 'NOT_SET';

if ($envSecret === 'NOT_SET' || $secret !== $envSecret) {
    http_response_code(403);
    echo "403 Forbidden - Invalid or missing migration secret.\n";
    exit;
}

try {
    $pdo = Database::getConnection();

    // Ensure migrations table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $action = $_GET['action'] ?? null;
    $targetFile = $_GET['file'] ?? null;
    $msg = '';

    $migrationsDir = __DIR__ . '/../migrations';

    if ($action && $targetFile) {
        $filePath = $migrationsDir . '/' . $targetFile;
        // make sure file exists and matches allowed directory
        if (!file_exists($filePath) || strpos(realpath($filePath), realpath($migrationsDir)) !== 0) {
            $msg = "<div class='error'>Error: File " . htmlspecialchars($targetFile) . " not found or illegal path.</div>";
        } else {
            if ($action === 'run') {
                try {
                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    if (pathinfo($targetFile, PATHINFO_EXTENSION) === 'sql') {
                        $sql = file_get_contents($filePath);
                        if (trim($sql) !== '') {
                            $pdo->exec($sql);
                        }
                    } else {
                        require $filePath;
                    }
                    $stmt = $pdo->prepare("INSERT IGNORE INTO migrations (filename) VALUES (?)");
                    $stmt->execute([$targetFile]);
                    $msg = "<div class='success'>Successfully ran <strong>$targetFile</strong></div>";
                } catch (Exception $e) {
                    $msg = "<div class='error'>Failed to run <strong>$targetFile</strong>:<br><br><code>" . htmlspecialchars($e->getMessage()) . "</code></div>";
                }
            } elseif ($action === 'mark_done') {
                $stmt = $pdo->prepare("INSERT IGNORE INTO migrations (filename) VALUES (?)");
                $stmt->execute([$targetFile]);
                $msg = "<div class='success'>Marked <strong>$targetFile</strong> as executed (SQL was skipped).</div>";
            } elseif ($action === 'untrack') {
                $stmt = $pdo->prepare("DELETE FROM migrations WHERE filename = ?");
                $stmt->execute([$targetFile]);
                $msg = "<div class='success'>Untracked <strong>$targetFile</strong>. It has been moved back to Pending.</div>";
            }
        }
    }

    // Fetch already executed migrations
    $stmt = $pdo->query("SELECT filename, executed_at FROM migrations ORDER BY executed_at DESC");
    $executedRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $executedMigrations = [];
    foreach ($executedRaw as $row) {
        $executedMigrations[$row['filename']] = $row['executed_at'];
    }

    $files = scandir($migrationsDir);
    $migrationFiles = [];
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'sql' || pathinfo($file, PATHINFO_EXTENSION) === 'php') {
            $migrationFiles[] = $file;
        }
    }
    sort($migrationFiles);

    ?>
    <!DOCTYPE html>
    <html>

    <head>
        <title>Database Migrations Toolkit</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding: 20px;
                max-width: 900px;
                margin: 0 auto;
                background: #f9fafb;
                color: #111827;
            }

            h1 {
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 10px;
                color: #1e40af;
            }

            p.desc {
                color: #4b5563;
                line-height: 1.5;
                margin-bottom: 20px;
            }

            .success {
                background: #ecfdf5;
                color: #065f46;
                padding: 15px;
                border border-l-4 border-l-green-600 border-green-200 border-solid;
                border-radius: 4px;
                margin-bottom: 20px;
            }

            .error {
                background: #fef2f2;
                color: #991b1b;
                padding: 15px;
                border border-l-4 border-l-red-600 border-red-200 border-solid;
                border-radius: 4px;
                margin-bottom: 20px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                overflow: hidden;
                font-size: 14px;
            }

            th,
            td {
                padding: 12px 15px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
            }

            th {
                background: #f8fafc;
                font-weight: 600;
                color: #475569;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.05em;
            }

            tr:last-child td {
                border-bottom: none;
            }

            .status-executed {
                color: #059669;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .status-pending {
                color: #d97706;
                font-weight: 600;
            }

            a.btn {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                border-radius: 4px;
                text-decoration: none;
                font-size: 13px;
                font-weight: 500;
                margin-right: 5px;
                transition: opacity 0.2s;
            }

            a.btn-run {
                background: #3b82f6;
                color: white;
                border: 1px solid #2563eb;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }

            a.btn-mark {
                background: #f1f5f9;
                color: #334155;
                border: 1px solid #cbd5e1;
            }

            a.btn-untrack {
                background: #fee2e2;
                color: #b91c1c;
                border: 1px solid #fca5a5;
                opacity: 0.8;
            }

            a.btn:hover {
                opacity: 0.85;
            }

            a.btn-untrack:hover {
                opacity: 1;
            }

            code {
                background: #fff1f2;
                padding: 2px 4px;
                border-radius: 4px;
                font-size: 13px;
                font-family: monospace;
            }
        </style>
    </head>

    <body>
        <h1>Database Migrations Toolkit</h1>
        <p class="desc">
            Use this interface to manage your SQL schema upgrades.<br>
            If a migration fails because it was already manually imported earlier, click <b>Skip (Mark Done)</b> to record
            it without executing the SQL.<br>
            If a migration was marked done by mistake, click <b>Untrack</b> to move it back to Pending.
        </p>

        <?php echo $msg; ?>

        <table>
            <thead>
                <tr>
                    <th>File</th>
                    <th>Status</th>
                    <th>Executed At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($migrationFiles as $file): ?>
                    <?php $isExecuted = isset($executedMigrations[$file]); ?>
                    <tr>
                        <td style="font-family: monospace;"><?php echo htmlspecialchars($file); ?></td>
                        <td>
                            <?php if ($isExecuted): ?>
                                <span class="status-executed">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Executed
                                </span>
                            <?php else: ?>
                                <span class="status-pending">Pending / Missing</span>
                            <?php endif; ?>
                        </td>
                        <td style="color: #64748b;"><?php echo $isExecuted ? $executedMigrations[$file] : '-'; ?></td>
                        <td>
                            <?php if ($isExecuted): ?>
                                <a href="?secret=<?php echo urlencode($secret); ?>&action=untrack&file=<?php echo urlencode($file); ?>"
                                    class="btn btn-untrack"
                                    onclick="return confirm('Are you sure you want to untrack this? It will become Pending again and SQL can be re-executed.');">Untrack</a>
                            <?php else: ?>
                                <a href="?secret=<?php echo urlencode($secret); ?>&action=run&file=<?php echo urlencode($file); ?>"
                                    class="btn btn-run" onclick="return confirm('Execute this SQL migration file now?');">Run
                                    SQL</a>
                                <a href="?secret=<?php echo urlencode($secret); ?>&action=mark_done&file=<?php echo urlencode($file); ?>"
                                    class="btn btn-mark"
                                    onclick="return confirm('Mark as done without actually running the SQL? Use this only if the schema changes are already in the database.');">Skip
                                    (Mark Done)</a>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </body>

    </html>
    <?php
} catch (Exception $e) {
    echo "<div style='color:red;font-family:sans-serif;'>Connection Error: " . htmlspecialchars($e->getMessage()) . "</div>";
}
