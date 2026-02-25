<?php

namespace App\Domain;

use JsonSerializable;

class Reflection implements JsonSerializable
{
    public ?int $id;
    public int $userId;
    public int $checkpointId;
    public string $type; // content, process, purpose
    public string $content;
    public ?string $submittedAt;

    public function __construct(
        int $userId,
        int $checkpointId,
        string $type,
        string $content,
        ?string $submittedAt = null,
        ?int $id = null
    ) {
        $this->userId = $userId;
        $this->checkpointId = $checkpointId;
        $this->type = $type;
        $this->content = $content;
        $this->submittedAt = $submittedAt;
        $this->id = $id;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'id' => $this->id,
            'user_id' => $this->userId,
            'checkpoint_id' => $this->checkpointId,
            'type' => $this->type,
            'content' => $this->content,
            'submitted_at' => $this->submittedAt
        ];
    }
}
