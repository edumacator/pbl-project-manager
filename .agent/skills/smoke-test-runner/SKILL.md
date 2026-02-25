# Smoke Test Runner Skill

## Goal
Provide a unified way to validate the basic functionality of the application (Boot Test and Smoke Test).

## Capabilities

### 1. Boot Verification
- Verify the PHP server is running and accessible on the configured port.
- Verify the Node.js/Vite dev server is running and accessible.

### 2. Manual Smoke Test Guidance
- Provide a structured checklist for manual verification based on [release-smoke-test.md](file:///c:/Antigravity_Projects/project-management/.agent/workflows/release-smoke-test.md).

## Usage

### Run Boot Check
```bash
powershell .agent/skills/smoke-test-runner/scripts/boot_check.ps1
```

### Guidance
Run this skill before submitting any PR to ensure the "Quality Bar" is met.
