# Architecture Rules

- **Layered Architecture**: Enforce a strict separation of concerns:
  - **Domain**: Entities and business logic.
  - **Repositories**: Interface for data access.
  - **Services**: Business logic orchestration.
  - **HTTP**: Controllers and routes.
- **No SQL Outside Repositories**: All SQL queries must be contained within the `mysql` repository implementation.
- **Thin Controllers**: Controllers should only handle HTTP request binding and response formatting. Business logic belongs in Services.
- **Consistent Response Envelope**: All API responses must follow the format: `{ ok: boolean, data: any, error: { code, message, details? } }`.
