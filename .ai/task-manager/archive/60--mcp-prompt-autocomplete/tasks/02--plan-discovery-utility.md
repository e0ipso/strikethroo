---
id: 2
group: "plan-discovery"
dependencies: []
status: "completed"
created: 2025-11-25
skills:
  - typescript
  - filesystem-ops
---
# Create Plan ID Discovery Utility

## Objective
Create a utility function that dynamically discovers active plan IDs from the file system by scanning `.ai/task-manager/plans/` and parsing YAML frontmatter to extract plan IDs.

## Skills Required
- **TypeScript Development**: Implement async file system operations with proper error handling
- **File System Operations**: Directory traversal, file reading, pattern matching

## Acceptance Criteria
- [ ] Create new module at `src/plan-discovery.ts` or add to existing `src/plan-utils.ts`
- [ ] Implement function that uses `findTaskManagerPath()` to locate `.ai/task-manager/`
- [ ] Scan `plans/` subdirectory for plan folders matching pattern `[0-9][0-9]*--*/`
- [ ] For each plan directory, locate `plan-[0-9][0-9]*--*.md` file
- [ ] Parse YAML frontmatter using regex to extract `id:` field
- [ ] Return array of plan IDs as numbers for numeric sorting
- [ ] Gracefully skip malformed plans or missing files without throwing errors

## Technical Requirements
- Use `findTaskManagerPath()` from `src/template-engine.ts` for consistent project detection
- Use `fs-extra` (existing dependency v11.3.1) for file system operations
- Parse YAML frontmatter using simple regex: `/^---\n([\s\S]*?)\n---/m` then extract `id: (\d+)`
- No caching - scan on each request (plan changes are infrequent)
- Export function signature: `async function getActivePlanIds(): Promise<number[]>`

## Input Dependencies
- `findTaskManagerPath()` from src/template-engine.ts
- Existing fs-extra dependency

## Output Artifacts
- Exported `getActivePlanIds()` function
- Utility module for plan discovery logic
- Error handling for graceful degradation

## Implementation Notes
The function should prioritize simplicity over performance. With typical plan counts <100, scanning on each request is acceptable. Use regex-based YAML extraction since frontmatter is machine-generated and follows strict schema.

Error handling approach:
- If `.ai/task-manager/` not found, return empty array `[]`
- If `plans/` directory empty, return empty array
- If individual plan file malformed, log warning to stderr and skip (don't break entire scan)
- Return sorted array (ascending numeric order)

Example implementation pattern:
```typescript
export async function getActivePlanIds(): Promise<number[]> {
  try {
    const taskManagerPath = await findTaskManagerPath();
    const plansDir = path.join(taskManagerPath, 'plans');
    // ... scan and parse
    return planIds.sort((a, b) => a - b);
  } catch (error) {
    console.error('Failed to discover plan IDs:', error);
    return [];
  }
}
```
