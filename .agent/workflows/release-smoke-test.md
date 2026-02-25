---
description: A checklist of critical application flows to test before any release.
---

# Release Smoke Test Workflow

## Goal
Ensure the core value of the application is maintained and that no "school-breaking" bugs are introduced.

## Critical Flow Checklist

### Authentication & Access
- [ ] User can log in.
- [ ] User can log out.

### Project Management
- [ ] Teacher can view project list.
- [ ] Teacher can create a new project.
- [ ] Teacher can delete a project.
- [ ] List of projects updates reactively after changes.

### Class & Team Management
- [ ] Teacher can view classes.
- [ ] Classes are sorted alphabetically.
- [ ] Students are correctly assigned to teams.

### Task Management
- [ ] Dashboard displays tasks correctly.
- [ ] "All" view shows hierarchical grouping (Class > Team).
- [ ] Timeline view accurately represents task durations and dependencies.

### Display Elements (Player)
- [ ] Add/Edit display elements (Clock, Countdown, YouTube Playlist).
- [ ] Player displays the selected element correctly.

## Verification
If any item on this checklist fails, the release must be blocked until a fix is implemented and verified.
