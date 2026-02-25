---
description: Procedures for safely initializing a new branch for a feature, fix, or chore.
---

# Start New Work Workflow

## Goal
Ensure a clean and up-to-date starting point for any new development task.

## Steps

1. **Confirm Repository is Clean**:
   - Run `git status` to ensure no uncommitted changes exist in your current workspace.
   - If there are changes, commit or stash them before proceeding.

2. **Pull Latest Main**:
   - `git checkout main`
   - `git pull origin main`

3. **Create Branch**:
   - Create a new branch based on the naming convention: `git checkout -b <type>/<name>`
   - Types: `feature/`, `fix/`, `chore/`.

4. **Identify Impacted Contracts**:
   - Review the codebase to identify any API endpoints, database schemas, or shared function signatures that will likely be modified.
   - Note these in your planning notes.

5. **Define Test Plan**:
   - **Before making any changes**, define how you will verify the success of the task.
   - Include specific boot tests and smoke tests relevant to the work.
