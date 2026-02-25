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
    public string $role; // 'teacher' or 'student'
    public ?string $password_hash;
    public ?string $auth_token;

    public function __construct(
        string $name,
        string $email,
        string $role,
        ?int $id = null,
        string $first_name = '',
        string $last_name = '',
        ?string $password_hash = null,
        ?string $auth_token = null
    ) {
        $this->name = $name;
        $this->email = $email;
        $this->role = $role;
        $this->id = $id;
        $this->first_name = $first_name;
        $this->last_name = $last_name;
        $this->password_hash = $password_hash;
        $this->auth_token = $auth_token;
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
            'auth_token' => $this->auth_token
        ];
    }
}
