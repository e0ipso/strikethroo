---
id: 8
group: "testing"
dependencies: [7]
status: "completed"
created: "2025-10-09"
skills:
  - "jest"
---
# Write Integration Tests for Conflict Detection

## Objective
Create comprehensive integration tests covering all conflict detection scenarios including first-time init, re-init with/without changes, force flag, and edge cases.

## Skills Required
- **jest**: Writing integration tests with mock file systems and async operations

## Acceptance Criteria
- [ ] Test first-time init (no metadata) copies all files
- [ ] Test re-init with no user changes updates files without prompts
- [ ] Test re-init with user changes detects conflicts correctly
- [ ] Test force flag bypasses prompts and overwrites all files
- [ ] Test corrupted metadata falls back to first-time init behavior
- [ ] Test metadata is correctly updated after each init
- [ ] All tests pass with >90% coverage of new code

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Create `src/__tests__/conflict-detection.integration.test.ts`
- Use Jest with fs-extra mocking or real temp directories
- Test the full workflow from CLI to file operations
- Follow existing test patterns in the codebase

**IMPORTANT: Meaningful Test Strategy Guidelines**

Your critical mantra for test generation is: "write a few tests, mostly integration".

**Definition of "Meaningful Tests":**
Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.

**When TO Write Tests:**
- Custom business logic and algorithms (hash comparison, conflict detection)
- Critical user workflows (init with conflicts, metadata updates)
- Edge cases and error conditions (corrupted metadata, missing files)
- Integration points between different system components (CLI → conflict detection → prompts)
- Complex validation logic or calculations (hash generation, file filtering)

**When NOT to Write Tests:**
- Third-party library functionality (inquirer, diff, fs-extra - already tested upstream)
- Framework features (Commander.js option parsing)
- Simple CRUD operations without custom logic
- Getter/setter methods or basic property access
- Configuration files or static data

## Input Dependencies
- Task 7: Fully integrated init command with conflict detection

## Output Artifacts
- `src/__tests__/conflict-detection.integration.test.ts` with comprehensive test coverage

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Set up test structure**:
   ```typescript
   import * as path from 'path';
   import * as fs from 'fs-extra';
   import * as os from 'os';
   import { init } from '../index';
   import { loadMetadata, calculateFileHash } from '../utils';

   describe('Conflict Detection Integration', () => {
     let tempDir: string;

     beforeEach(async () => {
       // Create temporary directory for each test
       tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-task-test-'));
     });

     afterEach(async () => {
       // Clean up
       await fs.remove(tempDir);
     });

     // Tests go here...
   });
   ```

2. **Test: First-time initialization**:
   ```typescript
   it('should copy all files on first-time init', async () => {
     const result = await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     expect(result.success).toBe(true);

     // Verify files were copied
     const configPath = path.join(tempDir, '.ai/task-manager/config/TASK_MANAGER.md');
     expect(await fs.pathExists(configPath)).toBe(true);

     // Verify metadata was created
     const metadataPath = path.join(tempDir, '.ai/task-manager/.init-metadata.json');
     expect(await fs.pathExists(metadataPath)).toBe(true);

     const metadata = await loadMetadata(metadataPath);
     expect(metadata).not.toBeNull();
     expect(metadata?.version).toBeDefined();
     expect(Object.keys(metadata?.files || {}).length).toBeGreaterThan(0);
   });
   ```

3. **Test: Re-init with no user changes**:
   ```typescript
   it('should update files without prompts when no changes detected', async () => {
     // First init
     await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     // Second init (no changes made)
     const result = await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     expect(result.success).toBe(true);
     // Should complete without any prompts (can't test prompts directly,
     // but can verify no errors and files are still correct)
   });
   ```

4. **Test: Re-init with user modifications**:
   ```typescript
   it('should detect user modifications and store in metadata', async () => {
     // First init
     await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     // Modify a file
     const configPath = path.join(tempDir, '.ai/task-manager/config/TASK_MANAGER.md');
     const originalContent = await fs.readFile(configPath, 'utf-8');
     await fs.writeFile(configPath, originalContent + '\n# User added content');

     // Get metadata before second init
     const metadataPath = path.join(tempDir, '.ai/task-manager/.init-metadata.json');
     const metadata = await loadMetadata(metadataPath);
     const originalHash = metadata?.files['config/TASK_MANAGER.md'];

     // Calculate current hash (should differ)
     const currentHash = await calculateFileHash(configPath);
     expect(currentHash).not.toBe(originalHash);

     // Note: We can't easily test interactive prompts in integration tests
     // This test verifies the detection logic works correctly
   });
   ```

5. **Test: Force flag bypasses prompts**:
   ```typescript
   it('should overwrite all files when force flag is used', async () => {
     // First init
     await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     // Modify a file
     const configPath = path.join(tempDir, '.ai/task-manager/config/TASK_MANAGER.md');
     await fs.writeFile(configPath, '# User content that should be overwritten');

     // Second init with force
     const result = await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: true,
     });

     expect(result.success).toBe(true);

     // Verify file was overwritten
     const content = await fs.readFile(configPath, 'utf-8');
     expect(content).not.toContain('User content that should be overwritten');
   });
   ```

6. **Test: Corrupted metadata handling**:
   ```typescript
   it('should handle corrupted metadata gracefully', async () => {
     // First init
     await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     // Corrupt metadata
     const metadataPath = path.join(tempDir, '.ai/task-manager/.init-metadata.json');
     await fs.writeFile(metadataPath, '{ invalid json }');

     // Second init should treat as first-time init
     const result = await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     expect(result.success).toBe(true);

     // Verify metadata was regenerated
     const metadata = await loadMetadata(metadataPath);
     expect(metadata).not.toBeNull();
     expect(metadata?.version).toBeDefined();
   });
   ```

7. **Test: Metadata version tracking**:
   ```typescript
   it('should track package version in metadata', async () => {
     await init({
       assistants: 'claude',
       destinationDirectory: tempDir,
       force: false,
     });

     const metadataPath = path.join(tempDir, '.ai/task-manager/.init-metadata.json');
     const metadata = await loadMetadata(metadataPath);

     expect(metadata?.version).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
   });
   ```

**Test coverage goals**:
- Focus on critical paths and edge cases
- Don't test inquirer/diff library functionality (already tested)
- Test the integration between components
- Verify metadata integrity and hash calculations
- Ensure backward compatibility

**Note on interactive prompts**:
- Integration tests can't easily test interactive CLI prompts
- Focus on testing detection logic and file operations
- Consider mocking inquirer for prompt-specific tests if needed

</details>
