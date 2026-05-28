---
id: 2
group: "data-collection"
dependencies: [1]
status: "completed"
created: "2025-10-16"
skills:
  - "typescript"
  - "filesystem"
---
# Implement Data Collection Module

## Objective
Create a data collection module that scans the filesystem, reads plan and task files, and extracts metadata from YAML frontmatter.

## Skills Required
- TypeScript development
- Node.js filesystem operations

## Acceptance Criteria
- [ ] Create `src/status.ts` module with data collection functions
- [ ] Implement function to scan `.ai/task-manager/plans/` directory
- [ ] Implement function to scan `.ai/task-manager/archive/` directory
- [ ] Parse YAML frontmatter from plan files (id, summary, created)
- [ ] Parse YAML frontmatter from task files (id, status)
- [ ] Handle missing directories gracefully (return empty arrays)
- [ ] Handle corrupted/malformed files gracefully (log warning, skip file)
- [ ] Return structured data objects with plan and task information

## Technical Requirements
Use the following technologies:
- `fs-extra` for filesystem operations (already a dependency)
- `gray-matter` or `js-yaml` for YAML frontmatter parsing (added in task 1)
- TypeScript interfaces for type safety

Expected data structures:
```typescript
interface PlanMetadata {
  id: number;
  summary: string;
  created: string;
  isArchived: boolean;
  tasks: TaskMetadata[];
}

interface TaskMetadata {
  id: number;
  status: 'pending' | 'in-progress' | 'completed' | 'needs-clarification';
}
```

## Input Dependencies
- YAML parsing library from task 1
- Existing filesystem utilities in `src/utils.ts`

## Output Artifacts
- `src/status.ts` with exported functions:
  - `collectPlanData(): Promise<PlanMetadata[]>`
  - Helper functions for scanning directories and parsing files

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Step 1: Define TypeScript Interfaces
Create interfaces in `src/types.ts` or at the top of `src/status.ts`:
```typescript
interface PlanMetadata {
  id: number;
  summary: string;
  created: string;
  isArchived: boolean;
  directoryPath: string;
  tasks: TaskMetadata[];
}

interface TaskMetadata {
  id: number;
  status: 'pending' | 'in-progress' | 'completed' | 'needs-clarification';
}
```

### Step 2: Implement Directory Scanning
```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';

async function scanPlansDirectory(baseDir: string): Promise<string[]> {
  const plansDir = path.join(baseDir, '.ai/task-manager/plans');
  if (!await fs.pathExists(plansDir)) return [];

  const entries = await fs.readdir(plansDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(plansDir, entry.name));
}
```

### Step 3: Parse Plan Files
```typescript
async function parsePlanFile(planDir: string): Promise<PlanMetadata | null> {
  try {
    const files = await fs.readdir(planDir);
    const planFile = files.find(f => f.startsWith('plan-') && f.endsWith('.md'));
    if (!planFile) return null;

    const content = await fs.readFile(path.join(planDir, planFile), 'utf-8');
    const { data } = matter(content);

    return {
      id: data.id,
      summary: data.summary,
      created: data.created,
      isArchived: planDir.includes('/archive/'),
      directoryPath: planDir,
      tasks: []
    };
  } catch (error) {
    console.warn(`Failed to parse plan in ${planDir}:`, error);
    return null;
  }
}
```

### Step 4: Parse Task Files
```typescript
async function parseTaskFiles(planDir: string): Promise<TaskMetadata[]> {
  const tasksDir = path.join(planDir, 'tasks');
  if (!await fs.pathExists(tasksDir)) return [];

  try {
    const taskFiles = await fs.readdir(tasksDir);
    const tasks: TaskMetadata[] = [];

    for (const file of taskFiles) {
      if (!file.endsWith('.md')) continue;

      try {
        const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
        const { data } = matter(content);
        tasks.push({
          id: data.id,
          status: data.status
        });
      } catch (err) {
        console.warn(`Failed to parse task file ${file}:`, err);
      }
    }

    return tasks.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.warn(`Failed to read tasks in ${planDir}:`, error);
    return [];
  }
}
```

### Step 5: Main Collection Function
```typescript
export async function collectPlanData(): Promise<PlanMetadata[]> {
  const baseDir = process.cwd();
  const plans: PlanMetadata[] = [];

  // Collect active plans
  const activeDirs = await scanPlansDirectory(baseDir);
  for (const dir of activeDirs) {
    const plan = await parsePlanFile(dir);
    if (plan) {
      plan.tasks = await parseTaskFiles(dir);
      plans.push(plan);
    }
  }

  // Collect archived plans
  const archiveDirs = await scanArchiveDirectory(baseDir);
  for (const dir of archiveDirs) {
    const plan = await parsePlanFile(dir);
    if (plan) {
      plan.tasks = await parseTaskFiles(dir);
      plans.push(plan);
    }
  }

  return plans.sort((a, b) => a.id - b.id);
}
```

### Error Handling Strategy
- Use try-catch blocks around file operations
- Log warnings for corrupted files but don't crash
- Return empty arrays/null for missing directories
- Skip malformed files and continue processing

### Testing Approach
Test with:
- Empty directories (no plans/archive)
- Plans without tasks
- Plans with tasks in various states
- Corrupted YAML frontmatter
- Missing frontmatter fields

</details>
