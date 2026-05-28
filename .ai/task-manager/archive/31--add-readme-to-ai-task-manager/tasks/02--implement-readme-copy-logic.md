---
id: 2
group: "readme-template"
dependencies: [1]
status: "completed"
created: 2025-10-16
skills:
  - typescript
  - node-js
---
# Implement README Copy Logic

## Objective
Modify the `copyCommonTemplates()` function in `src/index.ts` to ensure the README.md is copied to `.ai/task-manager/README.md` during initialization and always overwritten (bypassing conflict detection).

## Skills Required
- **typescript**: Modifying TypeScript code in the init command
- **node-js**: Working with fs-extra file operations

## Acceptance Criteria
- [ ] README.md is copied from `templates/ai-task-manager/README.md` to `.ai/task-manager/README.md` during init
- [ ] README.md is always overwritten on re-initialization (not subject to conflict detection)
- [ ] README.md is excluded from `.init-metadata.json` tracking
- [ ] Existing integration tests pass
- [ ] README appears in both new and re-initialized projects
- [ ] Implementation follows existing code patterns

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Modify `copyCommonTemplates()` function in `src/index.ts`
- Use existing fs-extra library operations
- Exclude README.md from metadata tracking (similar to scripts directory exclusion)
- Ensure README is copied after conflict resolution completes
- Follow TypeScript best practices and existing code style
- Maintain backwards compatibility with existing projects

## Input Dependencies
- Task 1: README.md template must exist at `templates/ai-task-manager/README.md`
- Existing `src/index.ts` implementation
- Existing conflict detection system
- Existing metadata tracking system

## Output Artifacts
- Modified `src/index.ts` with README copy logic
- README.md file in `.ai/task-manager/` after running init

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### Implementation Strategy

There are two viable approaches to ensure the README is always copied and not tracked:

#### Option 1: Copy After Conflict Resolution (Recommended)
Add explicit README copy logic after the `applyResolutions()` call in `copyCommonTemplates()`:

```typescript
// In copyCommonTemplates() function, after applyResolutions() or fs.copy()
// Ensure README is always current
const readmePath = resolvePath(baseDir, '.ai/task-manager/README.md');
const readmeTemplatePath = path.join(sourceDir, 'README.md');
if (await exists(readmeTemplatePath)) {
  await fs.copy(readmeTemplatePath, readmePath, { overwrite: true });
  await logger.debug('📄 Copied README.md (always overwrite)');
}
```

#### Option 2: Exclude from Metadata Tracking
Modify the `createMetadata()` function to skip README.md (similar to scripts directory):

```typescript
// In walkDir() function inside createMetadata()
// Skip README.md along with scripts directory and metadata file
if (relativePath.startsWith('config/scripts') ||
    relativePath.includes('/scripts/') ||
    relativePath === 'README.md' ||  // <-- Add this line
    relativePath === '.init-metadata.json') {
  continue;
}
```

### Recommended Approach: Combine Both Options
1. Use Option 2 to exclude README from metadata tracking
2. The existing `fs.copy(sourceDir, destDir)` operations will handle copying
3. README won't be included in conflict detection since it's not in metadata

### Key Implementation Points

1. **Location in Code**:
   - `copyCommonTemplates()` function starts at line 141 in src/index.ts
   - `createMetadata()` function starts at line 206
   - `walkDir()` helper starts at line 214

2. **Exclude from Metadata**:
   - Add `relativePath === 'README.md'` check in walkDir() around line 222-229
   - This ensures README.md is never added to `.init-metadata.json`

3. **Verify Existing Copy Logic**:
   - The `fs.copy(sourceDir, destDir)` calls already copy all files
   - By excluding README from metadata, it won't be subject to conflict detection
   - The existing `overwrite: true` flag ensures it's always updated

4. **Testing Approach**:
   - Run `npm test` to verify existing tests pass
   - Manually test with `npm run build && node dist/cli.js init --assistants claude --destination-directory /tmp/test-readme`
   - Verify README exists: `cat /tmp/test-readme/.ai/task-manager/README.md`
   - Test re-init: run init command again and verify README is updated

5. **Code Style Consistency**:
   - Follow existing patterns in the codebase
   - Use `await logger.debug()` for logging if adding explicit copy logic
   - Maintain existing indentation and formatting
   - Add comments explaining the README exclusion

### Edge Cases to Consider
- First-time init: README should be copied
- Re-initialization: README should be overwritten
- Force flag: README should still be copied/overwritten
- Missing template: Should fail gracefully (the exists check handles this)

</details>
