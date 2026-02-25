# Portability Guide

This project is designed with **Portability** as a core architectural principle. The goal is to allow the backend storage mechanism to be swapped (e.g., from MySQL to PostgreSQL, SQLite, or even a flat-file JSON system) with **zero changes** to the business logic or API controllers.

## Architecture: The Repository Pattern

We use the **Repository Pattern** to decouple the *domain logic* (Services) from the *data persistence* (Database).

### Structure
-   **Domain Entities** (`server/src/domain/`): Pure PHP classes representing data (e.g., `User`, `Project`). They have no knowledge of the database.
-   **Repository Interfaces** (`server/src/repositories/`): Interfaces defining *what* data operations are possible (e.g., `findUserById`, `saveProject`), but not *how*.
-   **Concrete Repositories** (`server/src/repositories/mysql/`): The actual implementation using MySQL (via PDO).

### How to Swap the Database

To switch to a different database engine (e.g., PostgreSQL), follow these steps:

1.  **Create New Repositories**:
    Create a new folder `server/src/repositories/postgres/`. Implement all interfaces found in `server/src/repositories/` using PostgreSQL-specific logic (or a different driver).
    *   Example: `PostgresUserRepository implements UserRepositoryInterface`.

2.  **Update Dependency Injection**:
    In `server/public/index.php`, swap the instantiation of the repositories.

    *Current (MySQL):*
    ```php
    $userRepo = new \App\Repositories\MySQL\UserRepository();
    ```

    *New (PostgreSQL):*
    ```php
    $userRepo = new \App\Repositories\Postgres\UserRepository();
    ```

3.  **That's it!**
    The `AuthService`, `ProjectService`, and all API Controllers depend only on the *Interface* (e.g., `UserRepositoryInterface`). They do not need to be changed.

## Frontend Portability

The frontend is a standard React SPA (Single Page Application). It communicates with the backend solely via JSON REST API.
-   **Hosting**: Can be hosted on any static file server (Nginx, Apache, Vercel, Netlify).
-   **API URL**: Configure the API base URL in `client/src/api/client.ts` to point to wherever the backend is hosted.
