<?php

namespace App\Services;

use App\Repositories\PeerReviewRepositoryInterface;
use App\Repositories\MySQL\FeedbackRepository;
use App\Repositories\MySQL\ProjectRepository;
use App\Repositories\MySQL\TaskRepository;
use App\Repositories\MySQL\AuditLogRepository;
use App\Domain\PeerReview;

class ReviewService
{
    private PeerReviewRepositoryInterface $reviewRepo;
    private FeedbackRepository $feedbackRepo;
    private ProjectRepository $projectRepo;
    private TaskRepository $taskRepo;
    private ?AuditLogRepository $auditRepo;
    private \App\Repositories\MySQL\PeerReviewAssignmentRepository $assignmentRepo; // New

    public function __construct(
        PeerReviewRepositoryInterface $reviewRepo,
        FeedbackRepository $feedbackRepo,
        ProjectRepository $projectRepo,
        TaskRepository $taskRepo,
        ?AuditLogRepository $auditRepo = null,
        ?\App\Repositories\MySQL\PeerReviewAssignmentRepository $assignmentRepo = null
    ) {
        $this->reviewRepo = $reviewRepo;
        $this->feedbackRepo = $feedbackRepo;
        $this->projectRepo = $projectRepo;
        $this->taskRepo = $taskRepo;
        $this->auditRepo = $auditRepo;
        $this->assignmentRepo = $assignmentRepo ?? new \App\Repositories\MySQL\PeerReviewAssignmentRepository(\App\Repositories\MySQL\Database::getConnection());
    }

    // ... (submitReview, submitFeedback, getFeedbackForTask, isTaskCompletable, getReviewsForTask, getReviewsForStudent remain same)

    public function autoAssignReviewers(int $projectId, string $context = 'team'): array
    {
        // 1. Get Project -> Teams -> Users
        // For now, let's assume context='team' means assign within each team.
        // context='project' means mix everyone.

        // Get Teams
        $teamRepo = new \App\Repositories\MySQL\TeamRepository(); // Should inject, but for speed...
        $teams = $teamRepo->findByProjectId($projectId);

        $assignments = [];

        foreach ($teams as $team) {
            $members = $teamRepo->getMembers($team->id);
            if (count($members) < 2)
                continue; // Need at least 2 to review each other

            // Shuffle
            shuffle($members);

            // Round Robin: 0->1, 1->2, ... last->0
            $count = count($members);
            for ($i = 0; $i < $count; $i++) {
                $reviewer = $members[$i];
                $reviewee = $members[($i + 1) % $count];

                // Create Assignment
                $assignment = new \App\Domain\PeerReviewAssignment(
                    $projectId,
                    $reviewer['id'],
                    $reviewee['id'],
                    null, // Task ID unknown yet, or maybe pick one?
                    'pending'
                );

                try {
                    $this->assignmentRepo->create($assignment);
                    $assignments[] = $assignment;
                } catch (\Exception $e) {
                    // Ignore duplicates
                }
            }
        }

        return $assignments;
    }


    public function getAssignments(int $projectId): array
    {
        return $this->assignmentRepo->findByProjectId($projectId);
    }

    public function submitReview(int $reviewerId, int $revieweeId, int $taskId, array $data): PeerReview
    {
        if (empty($data['content'])) {
            throw new \InvalidArgumentException("Review content is required.");
        }
        $rating = (int) ($data['rating'] ?? 0);
        if ($rating < 1 || $rating > 5) {
            throw new \InvalidArgumentException("Rating must be between 1 and 5.");
        }

        $review = new PeerReview($reviewerId, $revieweeId, $taskId, $data['content'], $rating);
        $id = $this->reviewRepo->create($review);
        $review->id = $id;

        return $review;
    }

    public function submitFeedback(int $authorId, int $taskId, array $data): \App\Domain\FeedbackEntry
    {
        $warm = $data['warm_feedback'] ?? '';
        $cool = $data['cool_feedback'] ?? '';
        $requiresRevision = (bool) ($data['requires_revision'] ?? false);
        $checklistConfirmed = (bool) ($data['checklist_confirmed'] ?? false);

        if (empty($warm) && empty($cool)) {
            throw new \InvalidArgumentException("Feedback content required.");
        }

        if (!$checklistConfirmed) {
            throw new \Exception("You must confirm the quality checklist before submitting.");
        }

        $feedback = new \App\Domain\FeedbackEntry(
            $taskId,
            $authorId,
            $warm,
            $cool,
            $requiresRevision,
            $checklistConfirmed
        );

        $id = $this->feedbackRepo->create($feedback);
        $feedback->id = $id;

        // "Status Sync: When feedback is submitted with requires_revision = true, the task status must automatically revert to In Progress"
        if ($requiresRevision) {
            $task = $this->taskRepo->findById($taskId);
            // If task is done/review, move back to doing
            if ($task) {
                $task->status = 'doing'; // Revert to doing (In Progress)
                $this->taskRepo->update($task);

                // Audit log if repo available
                if ($this->auditRepo) {
                    $logEntry = new \App\Domain\AuditLog(
                        $authorId,
                        'task_revision_requested',
                        json_encode(['message' => "Critique requested revision for task {$taskId}"])
                    );
                    $this->auditRepo->log($logEntry);
                }
            }
        }

        return $feedback;
    }

    public function getFeedbackForTask(int $taskId): array
    {
        return $this->feedbackRepo->findByTaskId($taskId);
    }

    public function isTaskCompletable(int $taskId): bool
    {
        $task = $this->taskRepo->findById($taskId);
        if (!$task)
            return false;

        $project = $this->projectRepo->findById($task->projectId);
        if (!$project)
            return false;

        if (!$project->requireCritique) {
            return true;
        }

        $latestFeedback = $this->feedbackRepo->getLatestFeedback($taskId);

        // Gate: No feedback OR latest requires revision = Closed
        if (!$latestFeedback)
            return false;
        if ($latestFeedback->requiresRevision)
            return false;

        return true;
    }

    public function getReviewsForTask(int $taskId): array
    {
        return $this->reviewRepo->findByTaskId($taskId);
    }

    // For Dashboard
    public function getReviewsForStudent(int $studentId): array
    {
        return $this->reviewRepo->findByRevieweeId($studentId);
    }
    // Peer Review Workspace Methods
    public function getReviewTargetDetails(int $assignmentId, int $reviewerId): array
    {
        $assignment = $this->assignmentRepo->findById($assignmentId);
        if (!$assignment) {
            throw new \Exception("Assignment not found.");
        }
        if ($assignment->reviewerId !== $reviewerId) {
            throw new \Exception("Unauthorized: You are not the reviewer for this assignment.");
        }

        $task = null;
        $attachments = [];
        $feedback = null; // New

        if ($assignment->taskId) {
            $task = $this->taskRepo->findById($assignment->taskId);

            // Fetch Feedback if completed
            if ($assignment->status === 'completed') {
                // Find feedback by this reviewer for this task
                // We don't have a direct method for (author, task) in Repo, but we can filter findByTaskId results
                // Or better, add method findByAuthorAndTask. For now, filter.
                $allFeedback = $this->feedbackRepo->findByTaskId($assignment->taskId);
                foreach ($allFeedback as $f) {
                    if ($f->authorId === $reviewerId) {
                        $feedback = $f;
                        break;
                    }
                }
            }

            // Fetch Attachments
            // Assuming task_attachments table exists from 018
            $pdo = \App\Repositories\MySQL\Database::getConnection();
            $stmt = $pdo->prepare("SELECT * FROM task_attachments WHERE task_id = :task_id");
            $stmt->execute([':task_id' => $assignment->taskId]);
            $rawAttachments = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Map to include 'url'
            $attachments = array_map(function ($att) {
                // Assuming file_path is relative to public or a reachable URL
                // If stored as 'uploads/file.pdf', and public is root, then /uploads/file.pdf
                $att['url'] = '/' . ltrim($att['file_path'], '/');
                return $att;
            }, $rawAttachments);
        }

        return [
            'assignment' => $assignment,
            'task' => $task,
            'attachments' => $attachments,
            'feedback' => $feedback
        ];
    }

    public function submitAssignmentReview(int $assignmentId, int $reviewerId, array $data): void
    {
        file_put_contents('debug.log', "Submitting Assignment: ID=$assignmentId, Reviewer=$reviewerId\n", FILE_APPEND);

        $assignment = $this->assignmentRepo->findById($assignmentId);
        if (!$assignment) {
            file_put_contents('debug.log', "Error: Assignment $assignmentId not found.\n", FILE_APPEND);
            throw new \Exception("Assignment not found.");
        }

        file_put_contents('debug.log', "Assignment Found: Reviewer={$assignment->reviewerId}, Task=" . ($assignment->taskId ?? 'NULL') . "\n", FILE_APPEND);

        if ($assignment->reviewerId !== $reviewerId) {
            file_put_contents('debug.log', "Error: Unauthorized. Expected {$assignment->reviewerId}, got $reviewerId\n", FILE_APPEND);
            throw new \Exception("Unauthorized.");
        }
        // Check if task ID is missing but provided in input
        $targetTaskId = $assignment->taskId;
        if (!$targetTaskId && !empty($data['task_id'])) {
            $targetTaskId = (int) $data['task_id'];
            // Update assignment with new task ID
            $pdo = \App\Repositories\MySQL\Database::getConnection();
            $stmt = $pdo->prepare("UPDATE peer_review_assignments SET task_id = :task_id WHERE id = :id");
            $stmt->execute([':task_id' => $targetTaskId, ':id' => $assignmentId]);
            file_put_contents('debug.log', "Linked Assignment $assignmentId to Task $targetTaskId\n", FILE_APPEND);
        }

        if (!$targetTaskId) {
            file_put_contents('debug.log', "Error: No task ID.\n", FILE_APPEND);
            throw new \Exception("No task associated with this assignment.");
        }

        try {
            // 1. Submit Feedback (Warm/Cool/Revision)
            $this->submitFeedback($reviewerId, $targetTaskId, $data);

            // 2. Mark Assignment as Completed
            // Need updateStatus method in Repo or raw SQL
            $pdo = \App\Repositories\MySQL\Database::getConnection();
            $stmt = $pdo->prepare("UPDATE peer_review_assignments SET status = 'completed' WHERE id = :id");
            $stmt->execute([':id' => $assignmentId]);
            file_put_contents('debug.log', "Success: Review submitted.\n", FILE_APPEND);
        } catch (\Exception $e) {
            file_put_contents('debug.log', "Error in submitFeedback: " . $e->getMessage() . "\n", FILE_APPEND);
            throw $e;
        }
    }
}
