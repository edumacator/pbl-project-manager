---
description: Procedures for handling unavoidable breaking changes to contracts.
---

# Contract Change Protocol Workflow

## Goal
Manage breaking changes in a way that minimizes disruption and ensures all consumers are properly migrated.

## Steps

1. **Identify All Consumers**:
   - Perform a global search for the function signature, endpoint URL, or database column you intend to change.
   - List all affected files and components.

2. **Decide Compatibility Strategy**:
   - **Strategy A: Support Both**: Add the new behavior/shape while maintaining the old one for a transition period.
   - **Strategy B: Atomic Migration**: Update all consumers in the same PR as the contract change (only for small, low-risk changes).
   - **Strategy C: Versioning**: (For APIs) Introduce a new version (e.g., `/api/v2/...`).

3. **Implement the Change**:
   - Follow the decided strategy.
   - Ensure the code is clear about which version/shape is the new standard.

4. **Update Consumers**:
   - Modify all identified consumer files to use the new contract or support the transition.

5. **Validation**:
   - Add or adjust tests to validate the new shape/behavior.
   - Ensure old tests still pass if supporting both.

6. **Documentation**:
   - Document the breaking change and the migration status in the PR.
   - Update any relevant documentation files.
