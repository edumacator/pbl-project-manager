# Project Management App - Developer Workflow & Context

## 1. System Overview
This is a **Project-Based Learning (PBL) Management Tool** designed for high school environments. It allows teachers to orchestrate projects, manage student teams, track progress via Kanban boards, and facilitate structured reflections and peer reviews.

### Core Entities
- **Classes**: Groups of students managed by a teacher.
- **Projects**: The core unit of work (e.g., "Build a Mars Rover"). Assigned to classes.
- **Teams**: Small groups of students within a class working on a project.
- **Tasks**: Kanban items managed by teams.
- **Checkpoints**: Milestones with specific due dates.
- **Reflections**: Student responses to checkpoints.

## 2. Architecture

### Tech Stack
- **Frontend**: React (Vite), TypeScript, TailwindCSS.
- **Backend**: Vanilla PHP 8.0+ (No framework).
- **Database**: MySQL 5.7+.

### Architectural Pattern
The backend follows a **Repository Pattern** to decouple business logic from data access.

**Layers:**
1.  **Entry Point (`server/public/index.php`)**:
    -   Handles all HTTP requests (Routing).
    -   Manages Dependency Injection (wiring Repositories to Services).
    -   Outputs JSON responses.
2.  **Service Layer (`server/src/Services`)**:
    -   Contains business logic (e.g., "Assign Project to Class", "Submit Reflection").
    -   Call Repositories for data.
3.  **Repository Layer (`server/src/Repositories`)**:
    -   Abstracts database queries.
    -   `MySQL` implementation resides in `server/src/Repositories/MySQL`.
4.  **Domain Layer (`server/src/Domain`)**:
    -   Pure PHP classes representing entities (e.g., `User`, `Project`).

## 3. Key Workflows & Data Flows

### A. Teacher Creates a Project
1.  **Frontend**: User submits form on `/teacher/projects/new`.
2.  **API**: `POST /api/v1/projects` -> `index.php`.
3.  **Controller Logic** (in `index.php`): Calls `ProjectService->createProject($data)`.
4.  **Service**: Validates input, calls `ProjectRepository->save($project)`.
5.  **Database**: Inserts into `projects` table.

### B. Student Moves a Task (Kanban)
1.  **Frontend**: Drag and drop on Board. `useKanban` hook calls API.
2.  **API**: `PATCH /api/v1/tasks/:id` -> `index.php`.
3.  **Controller Logic**: Calls `TaskService->updateTask($id, $data)`.
4.  **Service**:
    -   Updates status.
    -   **Audit Log**: Calls `AuditLogRepository` to record the move.
5.  **Database**: Updates `tasks` table, inserts into `task_audit_logs`.

### C. Class Enrollment
1.  **Frontend**: Teacher enters email in "Add Student".
2.  **API**: `POST /api/v1/classes/:id/students`.
3.  **Service**: `ClassService->enrollStudentByEmail`.
    -   Checks if user exists (by email).
    -   If not, creates shadow user.
    -   Links user to class in `class_enrollments`.

## 4. Codebase Map

### Server (`/server`)
-   `public/index.php`: **Main Entry Point**. All routing and DI config is here.
-   `src/Domain`: Entity definitions.
-   `src/Services`: Business logic. **Add new features here**.
-   `src/Repositories`: Database interactions.
    -   `MySQL/`: SQL queries live here.
-   `migrations/`: Database schema changes.

### Client (`/client`)
-   `src/api/client.ts`: typed fetch wrapper.
-   `src/pages`: Main views (e.g., `TeacherDashboard`, `ProjectBoard`).
-   `src/components`: Reusable UI (e.g., `KanbanColumn`, `PeerReviewModal`).
-   `src/types`: TypeScript interfaces matching Domain entities.

## 5. Development Workflow (How to Add a Feature)

1.  **Database**:
    -   Create a new migration file in `server/migrations/` (e.g., `009_new_feature.sql`).
    -   Run `php server/migrations/run_migrations.php`.

2.  **Backend**:
    -   **Domain**: Update/Create Entity class in `src/Domain`.
    -   **Repository**: Add method to interface and `MySQL` implementation.
    -   **Service**: Add business logic method.
    -   **Wiring**: Instantiate the new pieces in `public/index.php`.
    -   **Route**: Add `if/preg_match` block in `public/index.php` to handle the API endpoint.

3.  **Frontend**:
    -   **Types**: Update `src/types` to match new API response.
    -   **API**: Add wrapper function in `src/api` (optional, or call `api.get/post` directly).
    -   **UI**: Build components. Use **Tailwind** for styling.

## 6. API Conventions
-   **Base URL**: `/api/v1`
-   **Response Format**:
    ```json
    {
      "ok": true,
      "data": { ... },
      "error": null
    }
    ```
-   **Errors**: Return `{ "ok": false, "error": { "code": "...", "message": "..." } }`.

## 7. Current Limitations & "Gotchas"
-   **Auth**: Currently hardcoded (Teacher ID=1, Student ID=2) or basic stub.
-   **Routing**: Centralized in `index.php`. Do not look for separate controller files yet.
-   **Validation**: Mostly done in Services.

## 8. Project Status & Roadmap

### ✅ Completed
-   **Core Architecture**: Repository pattern, API structure, React setup.
-   **Project Management**: Create/Edit projects, assign to classes.
-   **Class Management**: Create classes, enroll students (via email).
-   **Team Management**: Create teams, add/remove members.
-   **Kanban Board**: Drag-and-drop tasks, audit logging.
-   **Checkpoints**: Teachers can create milestones; Students can submit reflections.
-   **Teacher Dashboard**: Overview of classes and projects.

### 🚧 In Progress / Needs Polish
-   **Peer Reviews**: 
    -   Schema and API endpoints exist.
    -   Frontend Modal exists (`PeerReviewModal`).
    -   *Next Step*: Fully test the flow and add a "View Reviews" interface for teachers/students.
-   **Analytics**: 
    -   "At Risk" logic exists in `StudentService`.
    -   API endpoint `/api/v1/analytics/at-risk` exists.
    -   *Next Step*: Visualize this better on the Dashboard (Charts/Graphs).
-   **Auth**:
    -   Currently using **Hardcoded Stubs** (Teacher ID=1, Student ID=2).
    -   *Critical Next Step*: Implement real JWT/Session-based auth and Password Hashing.

### 📋 To Do (Roadmap)
-   **Student Dashboard**: Dedicated view for students to see all their active projects and tasks across classes.
-   **Advanced Analytics**: Team velocity tracking, contribution breakdown.
-   **Settings Page**: Allow users to change profile/password.
-   **Deployment**: CI/CD pipelines, Dockerfile (if needed), Helper scripts for prod deployment.

