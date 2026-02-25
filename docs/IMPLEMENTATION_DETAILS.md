# Implementation Audit Reference

## 1. Overview
This document details the **API Structure**, **Backend Implementation**, and **Data Connections** for the Project Management App. It is intended for external agents or developers to audit the implementation against requirements.

---

## 2. Core Patterns

### A. API Entry Point (`server/public/index.php`)
-   **Routing**: Raw PHP `if/else` and `preg_match` on `REQUEST_URI`.
-   **Dependency Injection**: All Repositories and Services are instantiated manually at the top of the file.
-   **Response Format**: JSON Envelope `{ ok: bool, data: mixed, error: ?object }`.

### B. Service Layer (`server/src/Services/*`)
-   **Responsibility**: Validation, Business Logic, Transaction Management.
-   **Input**: Arrays from Controller (JSON decode).
-   **Output**: Domain Objects or Arrays (to be JSON encoded by Controller).

### C. Repository Layer (`server/src/Repositories/MySQL/*`)
-   **Responsibility**: Pure SQL execution.
-   **Connection**: `PDO` Singleton via `App\Repositories\MySQL\Database`.
-   **Mapping**: Maps raw SQL rows (`array`) to Domain Objects (`App\Domain\*`).

---

## 3. Feature Verticals

### I. Projects

**1. Create Project**
-   **API**: `POST /api/v1/projects`
-   **Controller**: Decodes JSON, calls `ProjectService->createProject`.
-   **Service (`ProjectService`)**:
    -   Validates `title` and `driving_question`.
    -   Instantiates `Project` domain object.
    -   Calls `ProjectRepo->create`.
    -   *If `class_id` present*: calls `ProjectRepo->assignToClass`.
-   **Repository (`ProjectRepository`)**:
    -   `INSERT INTO projects (...)`.
    -   `INSERT INTO project_classes (...)`.

**2. Get Project Details**
-   **API**: `GET /api/v1/projects/:id`
-   **Service**: `ProjectService->getProjectById($id)`.
-   **Repository**:
    -   `SELECT * FROM projects WHERE id = ?`.
    -   *Sub-query*: `SELECT * FROM classes JOIN project_classes ...` to hydrate `classes` array.
    -   Returns fully hydrated `Project` object.

**3. Assign Project to Class**
-   **API**: `POST /api/v1/projects/:id/assign`
-   **Payload**: `{ "class_id": 123 }`
-   **Service**: `ProjectService->assignProjectToClass`.
-   **Repository**: `INSERT IGNORE INTO project_classes ...`.

---

### II. Tasks (Kanban)

**1. Create Task**
-   **API**: `POST /api/v1/projects/:id/tasks`
-   **Payload**: `{ "title": "...", "status": "todo", "project_id": ... }`
-   **Service (`TaskService`)**:
    -   Validates `title` and `project_id`.
    -   Create `Task` object.
    -   **Audit**: Calls `AuditLogRepository->log('TASK_CREATED', ...)`.
-   **Repository (`TaskRepository`)**:
    -   `INSERT INTO tasks (...)`.

**2. Update Task (Move/Edit)**
-   **API**: `PATCH /api/v1/tasks/:id`
-   **Payload**: `{ "status": "doing", "assignee_id": 5 }`
-   **Service**:
    -   `TaskRepo->findById($id)`.
    -   Compares old vs new values to generate diff.
    -   Updates Task properties.
    -   `TaskRepo->update($task)`.
    -   **Audit**: `AuditLogRepo->log('TASK_UPDATED', changes)`.
-   **Repository**:
    -   `UPDATE tasks SET ... WHERE id = ...`.

**3. Get Tasks**
-   **API**: `GET /api/v1/projects/:id/tasks`
-   **Service**: `TaskService->getTasksByProject($projectId, $teamId)`.
-   **Repository**:
    -   `SELECT * FROM tasks WHERE project_id = ?`.
    -   Optional: `AND team_id = ?`.

---

### III. Class & Enrollment

**1. Create Class**
-   **API**: `POST /api/v1/classes`
-   **Service (`ClassService`)**: `createClass`.
-   **Repository (`ClassRepository`)**: `INSERT INTO classes`.

**2. Enroll Student**
-   **API**: `POST /api/v1/classes/:id/students`
-   **Payload**: `{ "email": "student@school.edu", "name": "..." }`
-   **Service**:
    -   Checks `UserRepo->findByEmail`.
    -   *If missing*: `UserRepo->create` (auto-create shadow account).
    -   `ClassRepo->enrollStudent($classId, $userId)`.
-   **Repository**:
    -   `INSERT INTO class_enrollments ...`.

---

### IV. Checkpoints & Reflections

**1. Create Checkpoint**
-   **API**: `POST /api/v1/projects/:id/checkpoints`
-   **Service (`CheckpointService`)**: `createCheckpoint`.
-   **Repository**: `INSERT INTO checkpoints`.

**2. Submit Reflection**
-   **API**: `POST /api/v1/checkpoints/:id/reflections`
-   **Payload**: `{ "content": "..." }`
-   **Service**:
    -   Validates content.
    -   `ReflectionRepo->create`.
-   **Repository**: `INSERT INTO reflections`.

---

### V. Peer Reviews

**1. Submit Review**
-   **API**: `POST /api/v1/tasks/:id/reviews`
-   **Payload**: `{ "rating": 5, "content": "Good job" }`
-   **Service (`ReviewService`)**:
    -   Validates rating (1-5).
    -   `ReviewRepo->create`.
-   **Repository**: `INSERT INTO peer_reviews`.

---

## 4. Key Data Structures (Domain Objects)

-   **Project**: `id, title, drivingQuestion, description, teacherId, dueDate, classes[]`
-   **Task**: `id, projectId, title, type, status, assigneeId, teamId, dueDate, dependencies[]`
-   **User**: `id, name, email, role`

## 5. Security & Validation Notes
-   **Auth**: Currently **stubbed** in `AuthService` and `index.php`. No real JWT verification yet.
-   **Input**: Basic validation in Service layer (e.g. `empty()` checks).
-   **Output Sanitization**: `json_encode` handles basic escaping, but XSS protection relies on Frontend (React).
