# API Contract

Base URL: `/api/v1`

## Response Envelope
All responses follow this format:
```json
{
  "ok": boolean,
  "data": any | null,
  "error": {
    "code": string,
    "message": string,
    "details": any | null
  } | null
}
```

## Endpoints

### Health Check
- `GET /api/health`
  - Returns system status.

### Projects
- `POST /projects`
  - Create a new project.
- `GET /projects`
  - List projects (simple list).
- `GET /projects/:id`
  - Get project details.

### Teams
- `POST /projects/:projectId/teams`
  - Create a team in a project.
- `GET /projects/:projectId/teams`
  - List teams in a project.

### Sprints
- `POST /projects/:projectId/sprints`
  - Create a sprint.

### Tasks
- `GET /projects/:id/tasks`: List tasks
- `POST /projects/:id/tasks`: Create task
- `PATCH /tasks/:id`: Update task

### Checkpoints & Reflections
- `GET /projects/:id/checkpoints`: List project checkpoints
- `POST /projects/:id/checkpoints`: Create checkpoint
- `POST /checkpoints/:id/reflections`: Submit reflection
- `GET /checkpoints/:id/reflections`: List reflections

### Peer Reviews
- `POST /tasks/:id/reviews`: Submit peer review
- `GET /tasks/:id/reviews`: Get reviews for a task

### Auth (Stub for Phase 2)
- `POST /auth/login`
- `POST /auth/register`
