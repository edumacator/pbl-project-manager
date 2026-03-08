<?php
require 'src/Env.php';
\App\Env::load('.env');
require 'src/autoload.php';
$pdo = \App\Repositories\MySQL\Database::getConnection();
print_r($pdo->query('SHOW COLUMNS FROM projects')->fetchAll(PDO::FETCH_ASSOC));
