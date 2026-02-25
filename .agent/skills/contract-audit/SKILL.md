# Contract Audit Skill

## Goal
Detect changes to project contracts (APIs, schemas, function signatures) and flag risks early in the development process.

## Capabilities

### 1. Risk Detection
- Analyze changes in `server/src` for altered function signatures and return types.
- Scan for modifications to `endpoint` configurations or controllers that change JSON response shapes.
- Identify new or altered SQL migrations in `server/scripts` or schema changes in `schema.sql`.

### 2. Heuristic Analysis
The auditing script provides a heuristic overview of potential breaking changes by comparing the current branch against the baseline.

## Usage

### Manual Audit
1. Run the auditing script:
   ```bash
   php .agent/skills/contract-audit/scripts/audit.php
   ```
2. Review the output for any items flagged as "Breaking" or "High Risk".

### Automation
This skill is intended to be run as part of the [pull-request-verification.md](file:///c:/Antigravity_Projects/project-management/.agent/workflows/pull-request-verification.md) workflow.

## Risk Categories
| Category | Description |
| :--- | :--- |
| **Breaking** | Removed field, renamed function, changed data type. |
| **Additive** | New endpoint, new field (low risk). |
| **Meta** | Configuration changes, migration changes. |
