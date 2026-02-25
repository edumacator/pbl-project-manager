# PR Packager Skill

## Goal
Automate the generation of high-quality PR descriptions that include contract impacts and testing evidence.

## Capabilities

### 1. Summary Generation
- Automatically list changed files and categorize them (Rules, Workflows, Client, Server).
- Identify potential risk areas based on file paths.

### 2. Template Injection
- Generate a PR description based on the project's standard template.

## Usage

### Generate PR Summary
```bash
php .agent/skills/pr-packager/scripts/generate_summary.php
```

## Template Structure
- **Summary**: What changed and why.
- **Test Steps**: How to verify.
- **Risk Notes**: Impacted contracts or side effects.
- **Evidence**: Placeholder for screenshots/snippets.
