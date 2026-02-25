# Git Workflow Rules

## Purpose
Enforce branch/PR safety and keep the `main` branch stable.

## Rules

### Branch Safety
- **Never commit directly to `main`**. All development must occur on feature, fix, or chore branches.
- **Naming Convention**:
    - `feature/<name>` for new features.
    - `fix/<name>` for bug fixes.
    - `chore/<name>` for maintenance or configuration updates.

### Merging and PRs
- **Every branch must merge via a Pull Request (PR)**.
- **PR Requirements**:
    - **Summary**: A concise description of the changes.
    - **Test Steps**: Clear instructions on how to verify the changes.
    - **Risk Notes**: Documentation of potential side effects or areas that might break.

### Sync Rule
- **Incorporating Latest Main**: Before merging, the source branch must incorporate the latest changes from `main` (either via merge or rebase).
- **Verification**: All verification steps (boot tests, smoke tests) must be re-run after syncing with `main` to ensure compatibility.
