<?php

function requireFields(array $data, array $required): void
{
    $missing = [];

    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }

    if (!empty($missing)) {
        errorResponse(
            'VALIDATION_ERROR',
            'Missing required fields',
            $missing
        );
    }
}

function requireRole(string $requiredRole, string $userRole): void
{
    if ($userRole !== $requiredRole) {
        errorResponse(
            'FORBIDDEN',
            'Insufficient permissions'
        );
    }
}
