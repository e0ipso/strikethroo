---
id: 4
group: "core-infrastructure"
dependencies: [3]
status: "completed"
created: "2025-10-09"
skills:
  - "typescript"
---
# Implement Conflict Detection Logic

## Objective
Create the core conflict detection function that compares current file hashes against stored metadata to identify user-modified files.

## Skills Required
- **typescript**: Complex business logic implementation with async operations

## Acceptance Criteria
- [ ] `detectConflicts()` function identifies all user-modified config files
- [ ] Function compares current hash vs original hash (NOT vs new file hash)
- [ ] Returns list of `FileConflict` objects for modified files
- [ ] Handles files that don't exist in metadata (new files in this version)
- [ ] Excludes `config/scripts/` directory from conflict detection
- [ ] Properly handles missing or deleted files

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Create new function in `src/utils.ts` or `src/conflict-detector.ts`
- Use hash utilities from task 3
- Filter files to only check `.ai/task-manager/config/` directory
- Read both user's current file and new incoming file for diff generation

## Input Dependencies
- Task 3: Hash calculation and metadata loading utilities
- Task 2: `FileConflict` type definition

## Output Artifacts
- `detectConflicts()` function that returns `Promise<FileConflict[]>`

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Create conflict detection function signature**:
   ```typescript
   /**
    * Detect conflicts between user's current files and stored metadata
    * @param destDir - Destination directory (contains .ai/task-manager/)
    * @param templateDir - Template directory (contains files to copy)
    * @param metadata - Loaded metadata from last init
    * @returns Array of detected conflicts
    */
   export async function detectConflicts(
     destDir: string,
     templateDir: string,
     metadata: InitMetadata
   ): Promise<FileConflict[]> {
     const conflicts: FileConflict[] = [];
     const configDir = path.join(destDir, '.ai/task-manager/config');

     // Get all config files (recursively)
     const configFiles = await getConfigFiles(configDir);

     for (const relPath of configFiles) {
       // Skip scripts directory
       if (relPath.startsWith('config/scripts/')) continue;

       const userFilePath = path.join(destDir, '.ai/task-manager', relPath);
       const newFilePath = path.join(templateDir, 'ai-task-manager', relPath);

       // Check if file exists in user's directory
       if (!(await fs.pathExists(userFilePath))) continue;

       // Calculate current hash of user's file
       const currentHash = await calculateFileHash(userFilePath);
       const originalHash = metadata.files[relPath];

       // CRITICAL: Compare current hash vs original hash (from metadata)
       if (originalHash && currentHash !== originalHash) {
         // User has modified this file!
         const userContent = await fs.readFile(userFilePath, 'utf-8');
         const newContent = await fs.readFile(newFilePath, 'utf-8');

         conflicts.push({
           relativePath: relPath,
           userFileContent: userContent,
           newFileContent: newContent,
           originalHash,
           currentHash,
         });
       }
     }

     return conflicts;
   }
   ```

2. **Create helper function to get config files**:
   ```typescript
   /**
    * Get all config files recursively, returning relative paths
    */
   async function getConfigFiles(configDir: string): Promise<string[]> {
     const files: string[] = [];

     async function walk(dir: string, relativeBase: string) {
       if (!(await fs.pathExists(dir))) return;

       const entries = await fs.readdir(dir, { withFileTypes: true });

       for (const entry of entries) {
         const fullPath = path.join(dir, entry.name);
         const relativePath = path.join(relativeBase, entry.name);

         if (entry.isDirectory()) {
           await walk(fullPath, relativePath);
         } else if (entry.isFile()) {
           files.push(relativePath);
         }
       }
     }

     await walk(configDir, 'config');
     return files;
   }
   ```

3. **Edge case handling**:
   - **File not in metadata**: Treat as new file (no conflict)
   - **File deleted by user**: Skip (user intentionally removed it)
   - **Metadata corrupted**: Caller should handle by treating as first-time init
   - **Hash match**: File unchanged, safe to update (not a conflict)

**Key implementation details**:

- **Three-way comparison entities**:
  1. Original hash (from metadata) - baseline
  2. Current hash (calculated) - detects user changes
  3. New file content (read from template) - for diff display

- **Critical distinction**:
  ```typescript
  // ✅ CORRECT: Detect user modifications
  if (currentHash !== originalHash) { /* conflict */ }

  // ❌ WRONG: Would compare against new version
  if (currentHash !== newFileHash) { /* incorrect */ }
  ```

- **Why we read both files**: Even though we only compare hashes with the original, we need both current and new file content to generate the diff for the user prompt.

</details>
