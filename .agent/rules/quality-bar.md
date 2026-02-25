# Quality Bar Rules

## Purpose
Define the minimum criteria for a change to be considered "Done."

## Rules

### Verification Baseline
Every change must pass the following checks:
- **"Boot Test"**: The application must start.
    - Client: `npm run dev` builds and runs without errors.
    - Server: The PHP server starts and serves the API.
- **"Smoke Test"**: Critical flows must remain functional. See [release-smoke-test.md](file:///c:/Antigravity_Projects/project-management/.agent/workflows/release-smoke-test.md) for details.

### Scope Control
- **No Large Refactors**: Do not perform significant structural changes or major refactors without explicit approval from a human teammate.
- **Collateral Damage**: Do not reformat or lint the entire codebase as a side effect of a small change. Keep diffs focused and minimal.

### Documentation
- Significant logic changes or new features must be documented in the repository (e.g., `README.md` or dedicated docs).
