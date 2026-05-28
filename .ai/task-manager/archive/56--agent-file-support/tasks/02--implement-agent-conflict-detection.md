---
id: 2
group: conflict-detection
dependencies:
  - 1
status: completed
created: '2025-11-19'
skills:
  - typescript
  - file-system
---

# Task: Implement Agent File Conflict Detection

## Objective

Extend the hash-based conflict detection system to track agent file modifications in `.claude/agents/` directory, creating metadata tracking and integrating with existing conflict resolution workflow.

## Skills Required

- `typescript`: Extend metadata creation and conflict detection logic
- `file-system`: File hashing, metadata storage, and directory traversal

## Acceptance Criteria

1. Create `.claude/agents/.init-metadata.json` to store agent file hashes
2. Calculate SHA-256 hashes for all `.md` files in `.claude/agents/`
3. Detect conflicts when user modifies agent files between init runs
4. Reuse existing `detectConflicts()`, `promptForConflicts()`, and `applyResolutions()` functions
5. First-time init creates metadata without prompting
6. Re-init without modifications updates files silently
7. Re-init with modifications prompts for keep/overwrite resolution

## Technical Requirements

<details>
<summary>Implementation Details</summary>

### Files to Modify

1. **src/index.ts**:
   - Modify `createAssistantStructure()` to handle agent conflict detection
   - Create new `copyAgentTemplates()` helper function (mirrors `copyCommonTemplates()`)

### Implementation Steps

#### Step 1: Create `copyAgentTemplates()` Helper Function

Add new function similar to `copyCommonTemplates()` (lines 176-228):

```typescript
/**
 * Copy agent template files to .claude/agents directory with conflict detection
 */
async function copyAgentTemplates(
  assistantDir: string,
  sourceDir: string,
  force: boolean
): Promise<void> {
  const sourceAgentsDir = resolvePath(sourceDir, 'agents');
  const destAgentsDir = resolvePath(assistantDir, 'agents');
  const metadataPath = resolvePath(destAgentsDir, '.init-metadata.json');

  // Check if source agents directory exists
  if (!(await exists(sourceAgentsDir))) {
    return; // No agents to copy
  }

  // Load existing metadata if present
  const existingMetadata = await loadMetadata(metadataPath);

  // Scenario 1: First-time init (no metadata) - copy all files
  if (!existingMetadata) {
    await fs.copy(sourceAgentsDir, destAgentsDir);
    await createAgentMetadata(sourceAgentsDir, destAgentsDir, metadataPath);
    return;
  }

  // Scenario 2: Force flag - overwrite all files
  if (force) {
    await fs.copy(sourceAgentsDir, destAgentsDir, { overwrite: true });
    await createAgentMetadata(sourceAgentsDir, destAgentsDir, metadataPath);
    return;
  }

  // Scenario 3: Conflict detection - check for user modifications
  const conflicts = await detectConflicts(destAgentsDir, sourceAgentsDir, existingMetadata);

  if (conflicts.length === 0) {
    await fs.copy(sourceAgentsDir, destAgentsDir, { overwrite: true });
    await createAgentMetadata(sourceAgentsDir, destAgentsDir, metadataPath);
    return;
  }

  // Conflicts detected - prompt user for resolution
  console.log(
    chalk.yellow(
      `\n⚠  Detected ${conflicts.length} modified agent file(s). Prompting for resolution...\n`
    )
  );
  const resolutions = await promptForConflicts(conflicts);

  // Apply resolutions
  await applyResolutions(sourceAgentsDir, destAgentsDir, resolutions);

  // Update metadata for all files (including resolved conflicts)
  await createAgentMetadata(sourceAgentsDir, destAgentsDir, metadataPath);
}
```

#### Step 2: Create `createAgentMetadata()` Helper Function

Add new function similar to `createMetadata()` (lines 233-290):

```typescript
/**
 * Create or update metadata file for agent directory with current file hashes
 */
async function createAgentMetadata(
  sourceDir: string,
  destDir: string,
  metadataPath: string
): Promise<void> {
  const files: Record<string, string> = {};

  // Get all .md files in agents directory
  async function walkDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip metadata file itself
      if (entry.name === '.init-metadata.json') {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(destDir, fullPath);
        const hash = await calculateFileHash(fullPath);
        files[relativePath] = hash;
      }
    }
  }

  if (await exists(destDir)) {
    await walkDir(destDir);
  }

  // Create metadata object
  const metadata = {
    version: getPackageVersion(),
    timestamp: new Date().toISOString(),
    files,
  };

  // Save metadata
  await saveMetadata(metadataPath, metadata);
}
```

#### Step 3: Integrate into `createAssistantStructure()`

Replace the simple agent copying from Task 1 with conflict-aware copying:

```typescript
// Copy agent files for Claude with conflict detection
if (assistant === 'claude') {
  await copyAgentTemplates(assistantDir, sourceDir, options.force || false);
}
```

**Note**: Need to pass `options` parameter to `createAssistantStructure()` or access `force` flag differently.

#### Step 4: Update Function Signature

Modify `createAssistantStructure()` to accept force flag:

```typescript
async function createAssistantStructure(
  assistant: Assistant,
  baseDir: string,
  force: boolean = false
): Promise<void>
```

Update call site in `init()` function (line 106):

```typescript
await createAssistantStructure(assistant, baseDir, options.force || false);
```

</details>

## Input Dependencies

- Task 1 completed: Basic agent file copying implemented
- Existing utility functions: `loadMetadata()`, `saveMetadata()`, `calculateFileHash()`
- Existing conflict functions: `detectConflicts()`, `promptForConflicts()`, `applyResolutions()`

## Output Artifacts

- `.claude/agents/.init-metadata.json` file created with agent file hashes
- Conflict detection workflow functional for agent files
- User prompts for modified agent files during re-init

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Pattern to Follow

The implementation mirrors `copyCommonTemplates()` (lines 176-228) but:
- Scoped to `.claude/agents/` directory only
- Tracks `.md` files instead of config files
- No subdirectory exclusions needed (agents are flat structure)

### Key Differences from Common Templates

| Aspect | Common Templates | Agent Templates |
|--------|------------------|-----------------|
| **Location** | `.ai/task-manager/config/` | `.claude/agents/` |
| **Files Tracked** | All files except scripts/ | All `.md` files |
| **Metadata File** | `.ai/task-manager/.init-metadata.json` | `.claude/agents/.init-metadata.json` |
| **Directory Structure** | Nested (config/hooks/) | Flat (agents/) |

### Testing Workflow

1. **First-time init**: `npx . init --assistants claude --destination-directory /tmp/test1`
   - Verify `.claude/agents/.init-metadata.json` created
   - Check metadata contains hash for `plan-creator.md`

2. **Re-init without changes**: `npx . init --assistants claude --destination-directory /tmp/test1`
   - Should update silently without prompts
   - Verify metadata timestamp updated

3. **Re-init with modifications**:
   - Edit `/tmp/test1/.claude/agents/plan-creator.md`
   - Run `npx . init --assistants claude --destination-directory /tmp/test1`
   - Should prompt for keep/overwrite
   - Verify resolution is honored

4. **Force flag**: `npx . init --assistants claude --destination-directory /tmp/test1 --force`
   - Should overwrite without prompting
   - Verify metadata updated

### Error Handling

- If source agents directory doesn't exist, return early (no error)
- If metadata is corrupted, treat as first-time init
- If file hashing fails, log warning and continue

</details>
