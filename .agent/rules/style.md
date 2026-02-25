# Code Style Rules

## General

- Favor clarity over cleverness.
- No magic strings — use constants.
- No duplicated logic across services.
- Use DTO-style objects between layers.

## Naming

Backend:
- Repositories: ProjectRepositoryInterface
- Services: ProjectService
- Controllers: ProjectController

Frontend:
- Pages: PascalCase
- Components: PascalCase
- Hooks: useCamelCase
- API functions: camelCase

## Service Discipline

Services:
- Must not contain SQL.
- Must not depend on HTTP request object.
- Must return domain data only.

## Controller Discipline

Controllers:
- Parse request
- Validate
- Call service
- Return response envelope

Nothing more.

## Migrations

All DB changes must:
- be incremental
- live in server/migrations
- never modify prior migration files
