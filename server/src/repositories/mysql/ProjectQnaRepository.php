<?php

namespace App\Repositories\MySQL;

use App\Domain\ProjectQna;
use PDO;

class ProjectQnaRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function create(ProjectQna $qna): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO project_qna (project_id, author_id, question) VALUES (?, ?, ?)"
        );
        $stmt->execute([$qna->projectId, $qna->authorId, $qna->question]);
        return (int) $this->db->lastInsertId();
    }

    public function answer(int $qnaId, int $teacherId, string $answer): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE project_qna SET answer = ?, answered_by = ?, updated_at = NOW() WHERE id = ?"
        );
        return $stmt->execute([$answer, $teacherId, $qnaId]);
    }

    /**
     * @return ProjectQna[]
     */
    public function getByProjectId(int $projectId): array
    {
        $sql = "
            SELECT q.*, 
                   COALESCE(u_author.name, CONCAT(u_author.first_name, ' ', u_author.last_name)) as author_name,
                   COALESCE(u_answer.name, CONCAT(u_answer.first_name, ' ', u_answer.last_name)) as answered_by_name
            FROM project_qna q
            JOIN users u_author ON q.author_id = u_author.id
            LEFT JOIN users u_answer ON q.answered_by = u_answer.id
            WHERE q.project_id = ?
            ORDER BY q.created_at DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$projectId]);

        $results = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = ProjectQna::fromDb($row);
        }

        return $results;
    }
}
