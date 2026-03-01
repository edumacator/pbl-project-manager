<?php

spl_autoload_register(function ($class) {
    // Project-specific namespace prefix
    $prefix = 'App\\';

    // Base directory for the namespace prefix
    $base_dir = __DIR__ . '/';

    // Does the class use the namespace prefix?
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        // no, move to the next registered autoloader
        return;
    }

    // Get the relative class name
    $relative_class = substr($class, $len);

    // Split into parts based on the namespace separator
    $parts = explode('\\', ltrim($relative_class, '\\'));

    // The last part is always the actual class filename
    $filename = array_pop($parts);

    // Convert all directory parts to lowercase for Linux strict case matching
    $dir_parts = array_map('strtolower', $parts);

    // Reassemble the path
    $relative_path = empty($dir_parts) ? '' : implode('/', $dir_parts) . '/';
    $file = $base_dir . $relative_path . $filename . '.php';

    // If the file exists, require it
    if (file_exists($file)) {
        require $file;
    }
});
