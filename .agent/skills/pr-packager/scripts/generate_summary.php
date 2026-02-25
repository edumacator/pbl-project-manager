<?php
/**
 * PR Summary Generator
 */

echo "--- PR Description Template ---\n\n";

echo "## Summary\n";
echo "[Add brief description of why this change is being made]\n\n";

echo "## Proposed Changes\n";
exec("git diff --name-only main", $files);
if (empty($files)) {
    echo "- (No changes detected against main)\n";
} else {
    foreach ($files as $file) {
        echo "- $file\n";
    }
}
echo "\n";

echo "## Test Steps\n";
echo "1. [Step 1]\n";
echo "2. [Step 2]\n\n";

echo "## Risk Notes\n";
echo "- Impacted Contracts: [None/List]\n";
echo "- Side Effects: [None/List]\n\n";

echo "## Evidence\n";
echo "[Attach screenshots or terminal snippets here]\n";

echo "\n--- End of Template ---\n";
