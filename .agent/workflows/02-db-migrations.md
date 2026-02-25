---
description: Generate migrations + seed data
---

1. Create `/server/migrations` directory.
2. Create migration files for:
    - `001_initial_schema.sql` (Users, Projects, Teams)
    - `002_kanban_schema.sql` (Sprints, Tasks)
    - `003_interaction_schema.sql` (Reflections, Reviews, Audit Logs)
3. Create `/server/seeds` directory.
4. Create seed script `seed.php` to populate initial data.
