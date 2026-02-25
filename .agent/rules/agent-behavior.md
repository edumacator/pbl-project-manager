# Agent Behavior Rules

## Purpose
Ensure that AI agents (like Antigravity) behave as careful and helpful teammates.

## Rules for Agents

### Planning and Communication
- **Plan Before Editing**: Always provide an implementation plan before making changes. List all files to be modified and note any impacted contracts.
- **Minimal Diffs**: Strive for the smallest possible change that achieves the goal. Avoid unrelated changes.

### Safety and Instruction
- **No Unsolicited Changes**: Never push code, merge branches, or perform high-risk operations (like deleting data) without explicit instruction from a human user.
- **When in Doubt, Ask**: If it is unclear whether a change affects a contract or violates a project standard, assume it does and ask for clarification.

### Context Awareness
- Respect the existing architecture patterns (e.g., Layered Architecture, No SQL outside Repositories).
- Maintain consistency with existing naming conventions and code styles.
