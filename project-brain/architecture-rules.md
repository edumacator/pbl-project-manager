# Architecture Rules

## Portability First
The data layer must remain portable. Use the **Repository Pattern** to abstract database concerns, allowing the app to run on different engines (MySQL, SQLite) without changing business logic.

## Separation of Concerns
Strictly separate business logic (Services) from transport/UI concerns (Controllers/React Components).

## Composable Modules
Favor small, single-responsibility modules over large, monolithic structures.

## Decoupled Features
Avoid tight coupling between feature verticals (e.g., Peer Review should not be hard-coded into the Kanban Task logic).

## Reversible Migrations
Ensure all database migrations can be rolled back without data loss. Keep schema changes incremental.

## Auditability
Log meaningful workflow actions (state changes, assignments, reviews) to support the "coaching visibility" requirement.

## UI Responsiveness
The interface must be progressively disclosed and responsive. Do not overwhelm the user with all data at once.

## Model Extension
Before creating a new database table or model, verify if an existing one can be extended to support the requirement.

## Pattern Justification
Before introducing a new architectural pattern, verify that existing patterns are insufficient and explain the reasoning.
