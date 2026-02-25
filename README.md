# PBL Project Manager

A lightweight, portable project management tool designed for High School PBL (Project-Based Learning) environments. It facilitates project orchestration, team management, Kanban task tracking, and cognitive scaffolding through checkpoints and reflections.

## Features

-   **Role-Based Access**: Teacher (Project Creator) and Student (Team Member) roles.
-   **Project Orchestration**: Create projects with driving questions and milestones.
-   **Kanban Boards**: Drag-and-drop task management for student teams.
-   **Checkpoints & Reflections**: Scheduled milestones with structured reflection forms.
-   **Peer Reviews**: Structured feedback mechanism for team members.
-   **Analytics**: Teacher dashboard with insights on team velocity and "stuck" status.

## Architecture

-   **Frontend**: React + Vite + TailwindCSS.
-   **Backend**: PHP (Vanilla) + MySQL.
-   **Design Pattern**: Repository Pattern for database abstraction (allows swapping DB engines).

## Setup Instructions

### Prerequisites
-   PHP 8.0+
-   MySQL 5.7+
-   Node.js 16+ & npm

### Database Setup
1.  Create a MySQL database named `pbl_app`.
2.  Import the schema files from `server/migrations/` in order:
    -   `001_initial_schema.sql`
    -   `002_kanban_schema.sql`
    -   `003_interaction_schema.sql`
    -   `004_peer_review_schema.sql`
3.  Or run the migration script:
    ```bash
    php server/migrations/run_migrations.php
    ```

### Backend Setup
1.  Navigate to `server/` directory.
2.  Copy `.env.example` to `.env` (create one if missing) and set your DB credentials:
    ```env
    DB_HOST=localhost
    DB_NAME=pbl_app
    DB_USER=root
    DB_PASS=
    ```
3.  Start the PHP development server:
    ```bash
    php -S localhost:8001 -t public
    ```

### Frontend Setup
1.  Navigate to `client/` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:5174` in your browser.

## API Documentation
See [docs/api-contract.md](docs/api-contract.md) for detailed API endpoint descriptions.

## Portability
See [docs/PORTABILITY.md](docs/PORTABILITY.md) for details on how to swap the database backend (e.g., from MySQL to PostgreSQL or SQLite).
