# Codex Operating Rules

These rules govern how AI agents and contributors should interact with this codebase.

## Core Rules

- **Context First**: Always read the `/project-brain` directory before making significant changes.
- **Code Inspection**: Inspect the existing codebase and patterns before proposing new abstractions.
- **Extend, Don't Replace**: Prefer extending existing systems and models over introducing new parallel systems.
- **Domain Specificity**: This is not a generic enterprise PM product. It is a specialized tool for High School PBL.
- **Simplicity Over Density**: Preserve simplicity for student users. Prioritize cognitive scaffolding over adding more features.
- **No Silent Deviations**: Do not make schema or architectural changes silently. All changes must be justified and recorded.
- **Minimal Dependencies**: Avoid adding unnecessary external libraries. Stick to the core stack (PHP, React, MySQL).

## Task Execution Workflow

For any non-trivial task:
1. **Summarize Understanding**: State your understanding of the requirement.
2. **List Affected Files**: Identify all files that will be modified or created.
3. **Identify Risks**: Note potential side effects or technical debt.
4. **Propose Plan**: Outline the implementation steps.
5. **Implement**: Carry out the changes.
6. **Post-Implementation Summary**: Summarize what changed and note any tradeoffs made.
