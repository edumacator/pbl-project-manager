<?php

namespace App\Domain;

class ProjectResource implements \JsonSerializable
{
    public int $id;
    public int $projectId;
    public ?int $teamId;
    public ?int $taskId;
    public string $title;
    public string $url;
    public string $type;
    public ?string $createdAt;

    public function __construct(
        int $projectId,
        string $title,
        string $url,
        string $type = 'link',
        ?int $taskId = null,
        ?int $teamId = null,
        ?int $id = null,
        ?string $createdAt = null
    ) {
        $this->projectId = $projectId;
        $this->title = $title;
        $this->url = $url;
        $this->type = $type;
        $this->taskId = $taskId;
        $this->teamId = $teamId;
        $this->id = $id ?? 0;
        $this->createdAt = $createdAt;
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->projectId,
            'team_id' => $this->teamId,
            'task_id' => $this->taskId,
            'title' => $this->title,
            'url' => $this->url,
            'type' => $this->type,
            'created_at' => $this->createdAt
        ];
    }
}
