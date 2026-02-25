---
description: Bootstrap repo + folder structure + env templates + hello endpoints
---

1. Create directory structure:
    - `/client`
    - `/server/src/domain`
    - `/server/src/repositories/mysql`
    - `/server/src/services`
    - `/server/src/http`
    - `/server/public`
    - `/docs`
2. Initialize Frontend:
    - Run `npm create vite@latest client -- --template react` inside the root.
    - Install dependencies `npm install` in `/client`.
3. Initialize Backend:
    - Create `composer.json` (even if minimal).
    - Create `public/index.php` as entry point.
    - Create `.env.example`.
4. Create Documentation:
    - `docs/api-contract.md`
    - `docs/architecture.md`
5. Create Health Endpoint:
    - Implement a simple GET `/api/health` in PHP that returns JSON.
