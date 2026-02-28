<?php

namespace App\Domain;

class ProjectQna
{
    public function __construct(
        public int $projectId,
        public int $authorId,
        public string $question,
        public ?string $answer = null,
        public ?int $answeredBy = null,
        public ?int $id = null,
        public ?string $createdAt = null,
        public ?string $updatedAt = null,
        // Virtual properties for UI display
        public ?string $authorName = null,
        public ?string $answeredByName = null
    ) {
    }

    public static function fromDb(array $row): self
    {
        return new self(
            $row['project_id'],
            $row['author_id'],
            $row['question'],
            $row['answer'] ?? null,
            $row['answered_by'] ?? null,
            $row['id'] ?? null,
            $row['created_at'] ?? null,
            $row['updated_at'] ?? null,
            $row['author_name'] ?? null, // Will come from JOINs
            $row['answered_by_name'] ?? null
        );
    }
}
