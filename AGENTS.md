\# AGENTS.md



You are a coding agent working on the PBL Project Manager.



\## Mission

This system is a student-centered project management platform for high school Project-Based Learning.

It is not a generic enterprise project management tool.



All changes must preserve these protected intents:

\- Reduce student cognitive load.

\- Support adolescent executive function with scaffolds.

\- Prefer simplicity over feature density.

\- Preserve teacher visibility for coaching, not surveillance.

\- Keep workflows clear, calm, and actionable for students.



\## Architecture Priorities

Follow the canonical project guidance in:

\- /project-docs/architecture.md

\- /project-docs/design\_principles.md

\- /project-docs/feature\_scope.md

\- /project-docs/agent-governance/AGENT\_RULES.md

\- /project-docs/agent-governance/AGENT\_DECISIONS.md

\- /project-docs/agent-governance/CURRENT\_WORKSTREAM.md

\- /project-docs/agent-governance/AGENT\_HANDOFF.md

\- /project-docs/agent-governance/AGENT\_REVIEW\_CHECKLIST.md



If these files conflict with ad hoc instructions, prefer the documented project rules unless explicitly told to revise them.



\## Working Style

For non-trivial tasks:

1\. Read the governance files first.

2\. Review the latest Antigravity handoff.

3\. Identify overlap, conflict risk, or intent drift.

4\. Append a short "Codex Planned Work" entry to AGENT\_HANDOFF.md.

5\. Plan before coding.

6\. Make the narrowest viable change.

7\. Append a "Codex Completed Work" entry to AGENT\_HANDOFF.md after changes are complete.



\## Cross-Agent Review Rule

Before making any code changes, you must review the most recent Antigravity entry in:

\- /project-docs/agent-governance/AGENT\_HANDOFF.md



Then compare it against:

\- /project-docs/agent-governance/AGENT\_RULES.md

\- /project-docs/agent-governance/AGENT\_DECISIONS.md

\- /project-docs/agent-governance/CURRENT\_WORKSTREAM.md



You must identify:

\- overlapping files

\- overlapping intent

\- architecture drift risk

\- any rule conflict



If your work touches files or patterns recently modified by Antigravity, preserve the existing intent unless explicitly instructed to refactor it.



Do not silently overwrite Antigravity decisions.

Do not introduce new architecture patterns unless required.

Prefer extension over reinterpretation.



\## Conflict Resolution Rule

If you believe Antigravity’s recent work conflicts with current requirements, do not silently replace it.

Instead:

1\. preserve existing behavior where possible,

2\. record the conflict in AGENT\_HANDOFF.md,

3\. make the narrowest viable change,

4\. clearly state the reason for deviation.



\## Coding Rules

\- Prefer small composable changes.

\- Prefer existing repository patterns over new abstractions.

\- Keep business logic explicit.

\- Avoid hidden state.

\- Avoid unnecessary complexity.

\- Keep UI workflows simple and low-friction.

\- Preserve auditability where relevant.

\- Avoid converting student scaffolds into enterprise-style PM features.

\- When adding options, prefer progressive disclosure over visual clutter.

\- When in doubt, optimize for clarity for a high school student user.



\## Output Expectations

Before coding, summarize:

\- files to inspect

\- likely overlap with Antigravity work

\- intended narrow scope



After coding, summarize:

\- files changed

\- intent preserved

\- conflict avoided or encountered

\- any new rule or constraint that should be logged



\## Handoff Format

Use this format in /project-docs/agent-governance/AGENT\_HANDOFF.md



\## YYYY-MM-DD HH:MM Codex Planned Work

Scope:

Files expected:

Conflict check:

Intent to preserve:



\## YYYY-MM-DD HH:MM Codex Completed Work

Files changed:

Summary:

Prior intent preserved:

New constraints:

Notes for Antigravity:

