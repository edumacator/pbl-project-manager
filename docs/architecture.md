# Architecture & Portability

This project uses a repository pattern to ensure portability between different database engines (e.g., swapping MySQL for Postgres or Firebase) and to keep the backend logic decoupled from the HTTP layer.

## Layers

1.  **HTTP Layer (`/server/src/http`)**
    - **Responsibility**: Handle incoming requests, validate input format, call services, and return JSON responses.
    - **Rules**: logic here should be minimal.
    - **Framework Agnostic**: The controllers should not rely heavily on a specific framework's magic features.

2.  **Service Layer (`/server/src/services`)**
    - **Responsibility**: Implement business logic (e.g., "A student can only join a team if...", "When a task is moved to Done, check criteria...").
    - **Dependencies**: Injected with Repository interfaces.

3.  **Domain Layer (`/server/src/domain`)**
    - **Responsibility**: Plain PHP definition of entities (Project, Team, Task).
    - **Rules**: No database awareness. Pure data structures.

4.  **Repository Layer (`/server/src/repositories`)**
    - **Interfaces**: Define the contract for data access (e.g., `ProjectRepositoryInterface`).
    - **Implementations**:
        - `mysql/`: The MySQL implementation using PDO or a lightweight wrapper. All SQL lives here.

## Database Swapping
To swap the database:
1.  Create a new directory in `repositories/` (e.g., `postgres/`).
2.  Implement the interfaces defined in `repositories/`.
3.  Update the dependency injection container (or initialization script) to use the new implementation.

## Backend Swapping (PHP to Node/Python)
By adhering to the strict API contract defined in `/docs/api-contract.md`, the frontend is agnostic to the backend technology.
To swap the backend:
1.  Re-implement the API endpoints in the new language.
2.  Ensure the JSON response envelope remains identical.
