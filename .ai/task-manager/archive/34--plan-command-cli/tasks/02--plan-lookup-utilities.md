---
id: 2
group: "core-functionality"
dependencies: []
status: "completed"
created: "2025-10-16"
skills:
  - typescript
  - node-fs
---
# Plan Lookup and Loading Utilities

## Objective
Create utility functions to locate plans in both active and archive directories, load plan metadata and markdown content, and extract the Executive Summary section for display.

## Skills Required
- TypeScript for type-safe implementation
- Node.js filesystem operations using fs-extra library

## Acceptance Criteria
- [ ] Function to find plan by ID in plans/ or archive/ directories
- [ ] Function to load plan file with frontmatter and body content
- [ ] Function to extract Executive Summary section from markdown body
- [ ] Function returns plan location (active vs archived) for validation
- [ ] Graceful error handling for missing plans and corrupted files
- [ ] Reuses existing types from status.ts (PlanMetadata, TaskMetadata)
- [ ] Extends PlanMetadata to include body content and isArchived flag

## Technical Requirements
- Use `fs-extra` for filesystem operations
- Use `gray-matter` for YAML frontmatter parsing
- Search pattern: `.ai/task-manager/{plans,archive}/*/plan-*.md`
- Regex for Executive Summary extraction: `/## Executive Summary\n([\s\S]*?)(?=\n## |$)/`
- Return null for missing plans (not throw errors)
- Reuse `parseTaskFiles()` from status.ts for task statistics

## Input Dependencies
None - creates foundation utilities

## Output Artifacts
- New module `src/plan-utils.ts` with:
  - `findPlanById(planId: number): Promise<PlanLocation | null>`
  - `loadPlanData(planId: number): Promise<PlanData | null>`
  - `extractExecutiveSummary(markdown: string): string`
- Extended types for plan data with body content

## Implementation Notes

<details>
<summary>Click to expand detailed implementation guidance</summary>

### Type Definitions

Create extended types in `src/plan-utils.ts`:

```typescript
import { PlanMetadata, TaskMetadata } from './status';

export interface PlanLocation {
  planId: number;
  directoryPath: string;
  filePath: string;
  isArchived: boolean;
}

export interface PlanData extends PlanMetadata {
  bodyContent: string;
  executiveSummary: string;
}
```

### findPlanById Implementation

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';

export async function findPlanById(planId: number): Promise<PlanLocation | null> {
  const baseDir = process.cwd();
  const searchDirs = [
    { path: path.join(baseDir, '.ai/task-manager/plans'), archived: false },
    { path: path.join(baseDir, '.ai/task-manager/archive'), archived: true },
  ];

  for (const searchDir of searchDirs) {
    if (!(await fs.pathExists(searchDir.path))) continue;

    const entries = await fs.readdir(searchDir.path, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const planDir = path.join(searchDir.path, entry.name);
      const files = await fs.readdir(planDir);
      const planFile = files.find(f => f.startsWith('plan-') && f.endsWith('.md'));

      if (!planFile) continue;

      const filePath = path.join(planDir, planFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);

      if (data.id === planId) {
        return {
          planId,
          directoryPath: planDir,
          filePath,
          isArchived: searchDir.archived,
        };
      }
    }
  }

  return null;
}
```

### loadPlanData Implementation

```typescript
import { parseTaskFiles } from './status';

export async function loadPlanData(planId: number): Promise<PlanData | null> {
  const location = await findPlanById(planId);
  if (!location) return null;

  const content = await fs.readFile(location.filePath, 'utf-8');
  const { data, content: bodyContent } = matter(content);

  const tasks = await parseTaskFiles(location.directoryPath);
  const executiveSummary = extractExecutiveSummary(bodyContent);

  return {
    id: data.id,
    summary: data.summary,
    created: data.created,
    isArchived: location.isArchived,
    directoryPath: location.directoryPath,
    tasks,
    bodyContent,
    executiveSummary,
  };
}
```

### extractExecutiveSummary Implementation

```typescript
export function extractExecutiveSummary(markdown: string): string {
  // Match from "## Executive Summary" to next ## heading or end of file
  const regex = /## Executive Summary\n+([\s\S]*?)(?=\n## |$)/;
  const match = markdown.match(regex);

  if (!match) {
    return 'No Executive Summary found.';
  }

  // Trim whitespace and return
  return match[1].trim();
}
```

### Error Handling

- Return `null` for missing plans instead of throwing errors
- Let calling code handle error messages
- Use existing error handling patterns from status.ts for corrupted files
- Log warnings for corrupted frontmatter using chalk (follow status.ts pattern)

### Export Pattern

Make sure to export `parseTaskFiles` from status.ts if not already exported:

```typescript
// In src/status.ts
export { parseTaskFiles };
```

</details>
