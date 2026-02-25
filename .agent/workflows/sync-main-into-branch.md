---
description: Synchronize your feature branch with the latest changes from the main branch.
---

# Sync Main into Branch Workflow

## Goal
Ensure your feature branch is current with the baseline and resolve any integration issues early.

## Steps

1. **Fetch Latest Main**:
   - `git fetch origin main`

2. **Integrate Main**:
   - Merge: `git merge origin/main`
   - OR Rebase (if preferred/stable): `git rebase origin/main`

3. **Resolve Conflicts**:
   - If conflicts occur, resolve them manually.
   - Ensure you are not breaking existing logic or reverting necessary changes.

4. **Re-run Verification**:
   - **Boot Test**: Ensure the client and server still start correctly.
   - **Smoke Test**: Verify critical application flows are still functional.

5. **Note Contract Changes**:
   - Identify if the sync introduced any changes to shared contracts (APIs, schemas, etc.) that you were unaware of.
   - Update your implementation plan if necessary.
