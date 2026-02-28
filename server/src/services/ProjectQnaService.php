<?php

namespace App\Services;

use App\Domain\ProjectQna;
use App\Repositories\MySQL\ProjectQnaRepository;

class ProjectQnaService
{
    private ProjectQnaRepository $qnaRepo;

    public function __construct(ProjectQnaRepository $qnaRepo)
    {
        $this->qnaRepo = $qnaRepo;
    }

    public function askQuestion(int $projectId, int $authorId, string $question): ProjectQna
    {
        if (empty(trim($question))) {
            throw new \InvalidArgumentException("Question cannot be empty.");
        }

        $qna = new ProjectQna(
            projectId: $projectId,
            authorId: $authorId,
            question: $question
        );

        $id = $this->qnaRepo->create($qna);
        $qna->id = $id;

        // Reload to get names/timestamps (in a real app we might just return the fresh entity)
        // For simplicity we will just return the array of all questions and the frontend will replace it, or return a stub.
        return $qna;
    }

    public function answerQuestion(int $qnaId, int $teacherId, string $answer): bool
    {
        if (empty(trim($answer))) {
            throw new \InvalidArgumentException("Answer cannot be empty.");
        }

        return $this->qnaRepo->answer($qnaId, $teacherId, $answer);
    }

    /**
     * @return ProjectQna[]
     */
    public function getQuestionsForProject(int $projectId): array
    {
        return $this->qnaRepo->getByProjectId($projectId);
    }
}
