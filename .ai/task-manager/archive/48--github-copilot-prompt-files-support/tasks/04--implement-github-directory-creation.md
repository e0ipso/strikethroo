---
id: 4
group: "initialization"
dependencies: [3]
status: "completed"
created: 2025-10-31
skills:
  - typescript
  - file-system
---
# Implement GitHub Directory and File Creation Logic

## Objective
Add GitHub Copilot initialization logic to `src/index.ts` that creates `.github/prompts/` directory and generates four prompt files with proper naming convention (`tasks-*.prompt.md`).

## Skills Required
- **typescript**: Implementation logic and async operations
- **file-system**: Directory creation and file operations using fs-extra

## Acceptance Criteria
- [ ] GitHub assistant creates `.github/prompts/` directory
- [ ] Four prompt files generated with correct names:
  - `tasks-create-plan.prompt.md`
  - `tasks-generate-tasks.prompt.md`
  - `tasks-execute-blueprint.prompt.md`
  - `tasks-fix-broken-tests.prompt.md`
- [ ] Files use `convertMdToGitHubPrompt()` for conversion
- [ ] Proper error handling for file operations
- [ ] No conflicts with existing `.github/` directory if it exists
- [ ] Follows same pattern as Claude/Gemini/OpenCode implementations

## Technical Requirements
- Modify `src/index.ts` to add GitHub-specific initialization branch
- Use `ensureDir()` for directory creation (handles existing directories)
- Process all four template files from `templates/assistant/commands/tasks/`
- Use `readAndProcessTemplate()` with `assistant='github'` parameter
- Write converted content to `.github/prompts/` with `.prompt.md` extension

## Input Dependencies
- Task 3: Template processing must support GitHub assistant parameter

## Output Artifacts
- GitHub initialization logic in `src/index.ts`
- `.github/prompts/` directory with four prompt files when user runs init

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate Initialization Code
File: `src/index.ts`

Find the section that handles assistant-specific initialization. Look for where Claude, Gemini, and OpenCode directories are created (likely around template processing logic).

### Step 2: Add GitHub Conditional Branch

Add a new conditional block for GitHub assistant. The pattern should match existing assistants:

```typescript
if (assistants.includes('github')) {
  // Create .github/prompts directory
  const githubPromptsDir = resolvePath(destinationDir, '.github/prompts');
  await ensureDir(githubPromptsDir);

  // Template files to process
  const templateFiles = [
    'create-plan.md',
    'generate-tasks.md',
    'execute-blueprint.md',
    'fix-broken-tests.md'
  ];

  // Process each template
  for (const templateFile of templateFiles) {
    const templatePath = getTemplatePath(`assistant/commands/tasks/${templateFile}`);
    const format = getTemplateFormat('github'); // Returns 'md'

    // Convert using GitHub-specific processing
    const content = await readAndProcessTemplate(templatePath, format, 'github');

    // Generate output filename: create-plan.md → tasks-create-plan.prompt.md
    const commandName = templateFile.replace('.md', '');
    const outputFilename = `tasks-${commandName}.prompt.md`;
    const outputPath = resolvePath(githubPromptsDir, outputFilename);

    // Write the converted file
    await writeProcessedTemplate(content, outputPath);
  }

  logger.info('✓ GitHub Copilot prompt files created in .github/prompts/');
}
```

### Step 3: File Naming Convention

**Input → Output Mapping:**
- `create-plan.md` → `tasks-create-plan.prompt.md`
- `generate-tasks.md` → `tasks-generate-tasks.prompt.md`
- `execute-blueprint.md` → `tasks-execute-blueprint.prompt.md`
- `fix-broken-tests.md` → `tasks-fix-broken-tests.prompt.md`

**Rationale for Naming:**
- Prefix `tasks-` to namespace the commands
- Suffix `.prompt.md` required for GitHub Copilot discovery
- Matches OpenSpec convention for consistency

### Step 4: Error Handling

Ensure proper error handling:
- `ensureDir()` handles existing `.github/` directory gracefully
- Template reading errors should be caught and logged
- File write failures should be caught and reported

### Step 5: Verify Integration

After implementation:
1. Build the project: `npm run build`
2. Test initialization: `npm start init --assistants github --destination-directory /tmp/test`
3. Verify directory structure:
   ```bash
   ls -la /tmp/test/.github/prompts/
   ```
4. Check file contents have proper frontmatter and $ARGUMENTS

### Step 6: Handle Helper Function Dependencies

Ensure these helper functions are available (should already exist):
- `resolvePath()` - Path resolution
- `ensureDir()` - Directory creation
- `getTemplatePath()` - Template file location
- `writeProcessedTemplate()` - File writing

If any are missing, check existing assistant implementations for reference.

</details>
