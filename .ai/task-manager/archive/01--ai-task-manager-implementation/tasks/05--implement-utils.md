---
id: "05"
group: "file-operations"
dependencies: ["01", "02", "03"]
status: "completed"
created_at: "2025-09-01T10:00:00Z"
---

# Task 05: Implement File Operation Utilities

## Objective
Implement helper functions in utils.ts for directory creation, file copying, and path operations needed by the init command.

## Acceptance Criteria
- [ ] Function to create directories recursively
- [ ] Function to copy files from templates to destination
- [ ] Function to check if directory exists
- [ ] Function to parse assistant flag values
- [ ] Proper error handling for all file operations

## Technical Requirements
- Use fs-extra for robust file operations
- Use Node.js path module for cross-platform paths
- Implement async functions with proper error handling
- Type all functions using types from types.ts

## Input Dependencies
- src/utils.ts file created (from task 02)
- Type definitions (from task 03)
- fs-extra package installed (from task 01)

## Output Artifacts
- Complete utils.ts with file operation helpers
- Exported functions for use in index.ts

## Implementation Notes
```typescript
import * as fs from 'fs-extra';
import * as path from 'path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

export async function copyTemplate(src: string, dest: string): Promise<void> {
  await fs.copy(src, dest, { overwrite: true });
}

export function parseAssistants(value: string): string[] {
  return value.split(',').map(a => a.trim());
}
```