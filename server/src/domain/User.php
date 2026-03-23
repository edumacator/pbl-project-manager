<?php

namespace App\Domain;

use JsonSerializable;

class User implements JsonSerializable
{
    public ?int $id;
    public string $name; // Legacy compatibility
    public string $first_name;
    public string $last_name;
    public string $email;
    public string $role; // 'teacher', 'student', or 'admin'
    public bool $requiresPasswordChange;
    public ?string $password_hash;
    public ?string $auth_token;
    public ?string $student_id;

    public function __construct(
        string $name,
        string $email,
        string $role,
        ?int $id = null,
        string $first_name = '',
        string $last_name = '',
        ?string $password_hash = null,
        ?string $auth_token = null,
        ?string $student_id = null,
        bool $requiresPasswordChange = true
    ) {
        $this->name = $name;
        $this->email = $email;
        $this->role = $role;
        $this->id = $id;
        $this->first_name = $first_name;
        $this->last_name = $last_name;
        $this->password_hash = $password_hash;
        $this->auth_token = $auth_token;
        $this->student_id = $student_id;
        $this->requiresPasswordChange = $requiresPasswordChange;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'role' => $this->role,
            'requires_password_change' => $this->requiresPasswordChange,
            'auth_token' => $this->auth_token,
            'student_id' => $this->student_id
        ];
    }
}
