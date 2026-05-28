---
id: 7
group: "cli-integration"
dependencies: [3, 4, 5, 6]
status: "completed"
created: "2025-10-09"
skills:
  - "typescript"
---
# Integrate Conflict Detection with Init Command

## Objective
Modify the init command workflow in `src/index.ts` to incorporate conflict detection, interactive prompts, and metadata tracking.

## Skills Required
- **typescript**: Refactoring existing code to add new workflow steps

## Acceptance Criteria
- [ ] Init command checks for existing metadata before copying files
- [ ] Conflict detection runs when metadata exists and force flag is not set
- [ ] User prompts appear for detected conflicts
- [ ] Files are copied or skipped based on user choices
- [ ] Metadata is updated after successful file operations
- [ ] Force flag bypasses all prompts and overwrites files
- [ ] First-time init (no metadata) works exactly as before

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Modify `copyCommonTemplates()` function in `src/index.ts`
- Add metadata checking before file copy operations
- Integrate conflict detection and prompt functions
- Update metadata after each init operation
- Maintain backward compatibility

## Input Dependencies
- Task 3: Metadata utilities (load, save, hash)
- Task 4: Conflict detection function
- Task 5: Interactive prompt functions
- Task 6: Force flag in InitOptions

## Output Artifacts
- Modified `src/index.ts` with integrated conflict detection
- Updated `copyCommonTemplates()` or new helper functions

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Add metadata path constant**:
   ```typescript
   const METADATA_FILENAME = '.init-metadata.json';

   function getMetadataPath(baseDir: string): string {
     return path.join(baseDir, '.ai/task-manager', METADATA_FILENAME);
   }
   ```

2. **Modify copyCommonTemplates to handle conflicts**:
   ```typescript
   async function copyCommonTemplates(
     baseDir: string,
     force: boolean = false
   ): Promise<void> {
     const sourceDir = getTemplatePath('ai-task-manager');
     const destDir = resolvePath(baseDir, '.ai/task-manager');
     const metadataPath = getMetadataPath(baseDir);

     // Check if source template directory exists
     if (!(await exists(sourceDir))) {
       throw new Error(`Template directory not found: ${sourceDir}`);
     }

     // Load existing metadata (if any)
     const existingMetadata = await loadMetadata(metadataPath);

     // Handle three scenarios:
     // 1. No metadata (first-time init) - copy all files
     // 2. Metadata exists + force flag - copy all files
     // 3. Metadata exists + no force - check for conflicts

     if (!existingMetadata || force) {
       // Copy all files normally
       await fs.copy(sourceDir, destDir);
       await logger.debug(`📤 Copied ${sourceDir} to ${destDir}`);
     } else {
       // Conflict detection mode
       await logger.info('🔍 Checking for file conflicts...');

       const conflicts = await detectConflicts(
         baseDir,
         getTemplatePath(''),
         existingMetadata
       );

       if (conflicts.length === 0) {
         // No conflicts, safe to copy all
         await logger.info('✓ No conflicts detected, updating files...');
         await fs.copy(sourceDir, destDir);
       } else {
         // Prompt user for each conflict
         await logger.info(`⚠️  Found ${conflicts.length} modified file(s)`);
         const resolutions = await promptConflictResolution(conflicts);

         // Copy files based on user choices
         await copyWithResolutions(sourceDir, destDir, resolutions);

         // Display summary
         displayResolutionSummary(resolutions);
       }
     }

     // Update metadata after copy (always)
     await updateMetadata(baseDir, sourceDir);
   }
   ```

3. **Create selective copy function**:
   ```typescript
   /**
    * Copy files selectively based on conflict resolutions
    */
   async function copyWithResolutions(
     sourceDir: string,
     destDir: string,
     resolutions: Map<string, ConflictResolution>
   ): Promise<void> {
     // Get all files from source
     const allFiles = await getAllFiles(sourceDir);

     for (const file of allFiles) {
       const relativePath = path.relative(sourceDir, file);
       const destPath = path.join(destDir, relativePath);
       const normalizedPath = relativePath.replace(/\\/g, '/');

       // Check if this file has a conflict resolution
       const resolution = resolutions.get(normalizedPath);

       if (resolution === 'keep') {
         // Skip this file, keep user's version
         await logger.debug(`Skipping ${normalizedPath} (user choice: keep)`);
         continue;
       }

       // Copy the file (either no conflict or user chose overwrite)
       await fs.ensureDir(path.dirname(destPath));
       await fs.copy(file, destPath);
       await logger.debug(`Copied ${relativePath}`);
     }
   }
   ```

4. **Create metadata update function**:
   ```typescript
   /**
    * Update metadata after successful file copy
    */
   async function updateMetadata(
     baseDir: string,
     sourceDir: string
   ): Promise<void> {
     const metadataPath = getMetadataPath(baseDir);
     const destDir = path.join(baseDir, '.ai/task-manager');
     const configDir = path.join(destDir, 'config');

     // Get all config files and calculate their hashes
     const files: Record<string, string> = {};
     const configFiles = await getConfigFiles(configDir);

     for (const relPath of configFiles) {
       if (relPath.startsWith('config/scripts/')) continue; // Exclude scripts

       const filePath = path.join(destDir, relPath);
       if (await fs.pathExists(filePath)) {
         const hash = await calculateFileHash(filePath);
         files[relPath] = hash;
       }
     }

     // Create metadata object
     const metadata: InitMetadata = {
       version: getPackageVersion(),
       timestamp: new Date().toISOString(),
       files,
     };

     // Save metadata
     await saveMetadata(metadataPath, metadata);
     await logger.debug('✓ Metadata updated');
   }
   ```

5. **Update the init function to pass force flag**:
   ```typescript
   export async function init(options: InitOptions): Promise<CommandResult> {
     try {
       const baseDir = options.destinationDirectory || '.';
       const force = options.force || false;

       // ... existing code ...

       // Copy common templates with conflict detection
       await logger.info('📋 Copying common template files...');
       await copyCommonTemplates(baseDir, force);

       // ... rest of init code ...
     } catch (error) {
       // ... error handling ...
     }
   }
   ```

**Key workflow changes**:
1. **Before copy**: Check metadata existence
2. **During copy**: Detect conflicts → prompt → selective copy
3. **After copy**: Always update metadata with new hashes

**Backward compatibility**:
- First-time users see no changes
- `--force` flag provides escape hatch for automation
- Corrupted metadata treated as first-time init (graceful degradation)

</details>
