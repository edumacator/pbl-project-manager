---
description: Checklist for validating a Pull Request before it is merged into main.
---

# Pull Request Verification Workflow

## Goal
Verify that the proposed changes meet the project's quality standards and do not break existing functionality.

## Verification Checklist

### 1. Boot Checks
- [ ] Client starts and builds (`npm run dev`).
- [ ] Server starts and responds to basic requests.

### 2. Feature Checks
- [ ] New functionality works as described in the PR.
- [ ] Edge cases identified in the test plan have been verified.

### 3. Shared Surface Checks
- [ ] Identify areas likely affected by these changes (e.g., if you changed a shared UI component, check all pages using it).
- [ ] Verify that no regression has been introduced in these areas.

### 4. Contract Checks
- [ ] Have any API response shapes changed?
- [ ] Have any database schemas or migrations been added/modified?
- [ ] Have shared function signatures been altered?
- [ ] **Dependency Update**: If a contract was changed, have all consumers of that contract been updated?

## Required Evidence
Include one or more of the following in the PR description:
- **Terminal Snippets**: Output from test runs or build commands.
- **Screenshots/Recordings**: Visual proof of UI changes or successful flows.
- **Short Verification Notes**: A brief summary of manual tests performed.
