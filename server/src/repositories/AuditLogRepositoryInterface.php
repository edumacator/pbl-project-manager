<?php

namespace App\Repositories;

use App\Domain\AuditLog;

interface AuditLogRepositoryInterface
{
    public function log(AuditLog $log): int;
    public function findByUserId(int $userId): array;
}
