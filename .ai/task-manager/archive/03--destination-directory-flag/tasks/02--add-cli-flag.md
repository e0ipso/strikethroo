---
id: 2
group: "cli-updates"
dependencies: [1]
status: "completed"
created: "2025-09-01"
---

# Task 02: Add --destination-directory Flag to CLI

## Objective
Add the optional --destination-directory flag to the init command in cli.ts using Commander.js.

## Acceptance Criteria
- [x] Flag added to init command with appropriate description
- [x] Flag value passed to init function via options
- [x] Flag is optional (backward compatibility)
- [x] Supports both relative and absolute paths

## Technical Requirements
- Edit `src/cli.ts`
- Add .option() call for --destination-directory flag
- Pass value through to init function

## Input Dependencies
- Updated InitOptions type from task 01

## Output Artifacts
- CLI with new optional flag support

## Implementation Notes
Add to commander configuration:
```typescript
program
  .command('init')
  .requiredOption('--assistants <value>', 'Comma-separated list of assistants')
  .option('--destination-directory <path>', 'Directory to create project structure in (default: current directory)')
  .action(init);
```