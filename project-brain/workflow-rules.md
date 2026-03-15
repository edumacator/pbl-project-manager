# Workflow Rules

## Tool Roles
- **Architecture & Review**: Use high-level AI (e.g., ChatGPT) for project-wide architecture, pedagogical alignment, feature tradeoffs, and overall implementation review.
- **Code Implementation**: Use coding-specialized AI (e.g., Codex, Antigravity) for specific edits, refactors, migrations, wiring components, and writing tests.

## Process for Non-Trivial Changes
1. **Inspect**: Read relevant code and `/project-brain` docs.
2. **Summarize**: State understanding and scope.
3. **Propose**: Map out the plan and identify files.
4. **Identify Risks**: Note dependencies or breaking changes.
5. **Implement**: Execute the changes incrementally.
6. **Finalize**: Summarize what was done and update the `decision-log.md` if necessary.

## Process for Small Fixes
1. **Inspect**: Verify the issue in the affected files.
2. **Minimize**: Make the smallest fix possible to resolve the issue.
3. **Summarize**: Provide a brief note of what was changed.
