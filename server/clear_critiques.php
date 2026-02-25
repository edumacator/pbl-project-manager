<?php
require_once __DIR__ . '/src/autoload.php';
require_once __DIR__ . '/src/Env.php';
require_once __DIR__ . '/src/Repositories/MySQL/Database.php';

use App\Repositories\MySQL\Database;
use App\Env;

Env::load(__DIR__ . '/.env');

try {
    $pdo = Database::getConnection();

    // Clear feedback entries
    $pdo->exec("DELETE FROM feedback_entries");
    echo "Cleared feedback_entries.\n";

    // Reset assignments
    $pdo->exec("UPDATE peer_review_assignments SET status = 'pending'");
    echo "Reset peer_review_assignments to 'pending'.\n";

    // Optional: Reset Tasks status if needed? 
    // Maybe tasks moved to 'in_progress' or 'completed'.
    // User didn't ask, but might be helpful. I'll leave it for now.

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
