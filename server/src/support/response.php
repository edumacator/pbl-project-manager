<?php

function jsonResponse(bool $ok, $data = null, $error = null): void
{
    header('Content-Type: application/json');

    echo json_encode([
        'ok' => $ok,
        'data' => $data,
        'error' => $error
    ]);

    exit;
}

function errorResponse(string $code, string $message, $details = null): void
{
    jsonResponse(false, null, [
        'code' => $code,
        'message' => $message,
        'details' => $details
    ]);
}
