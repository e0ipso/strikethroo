---
id: 2
group: output-formatting
dependencies: []
status: completed
created: 2025-10-20T00:00:00.000Z
skills:
  - typescript
  - cli-formatting
---
# Modernize Init Command Output

## Objective

Transform the init command output in `src/index.ts` to match the visual aesthetic of status and plan commands by removing logger dependencies, implementing chalk-based formatting with section headers, and creating a structured output flow with proper visual hierarchy.

## Skills Required

- **typescript**: Modify TypeScript implementation and maintain type safety
- **cli-formatting**: Design and implement terminal output formatting with chalk

## Acceptance Criteria

- [ ] Remove all logger imports from `src/index.ts`
- [ ] Import and use chalk directly for all output formatting
- [ ] Create `formatSectionHeader()` helper function (adapted from status.ts/plan.ts pattern)
- [ ] Define `TERM_WIDTH` constant (80 characters, matching other commands)
- [ ] Implement structured output with 5 sections: Header, Configuration, Setup Progress, Created Files, Footer
- [ ] Use consistent color scheme: cyan headers/dividers, green success indicators, blue info bullets
- [ ] Replace logger calls with chalk-formatted console.log statements
- [ ] Maintain all existing functionality (no behavioral changes, only visual improvements)
- [ ] Code compiles without TypeScript errors

## Technical Requirements

**File modifications:**
- `src/index.ts`: Major refactoring of output logic

**Formatting patterns to extract from `src/status.ts` and `src/plan.ts`:**
```typescript
const TERM_WIDTH = 80;
const DIVIDER = '─'.repeat(TERM_WIDTH);

function formatSectionHeader(title: string): string {
  return `\n${chalk.cyan.bold(title)}\n${chalk.cyan(DIVIDER)}\n`;
}
```

**New output structure:**
1. Header: "AI Task Manager Initialization" with gray divider
2. Configuration: Target directory and assistants list
3. Setup Progress: Checkmarks for completed steps
4. Created Files: Grouped listing with visual hierarchy
5. Footer: Success message with gray divider

## Input Dependencies

None - this task can start immediately alongside Task 1.

## Output Artifacts

- Updated `src/index.ts` with modern chalk-based formatting
- Consistent visual output matching status/plan commands
- Reusable formatting utilities within index.ts

<details>
<summary>Implementation Notes</summary>

### Step-by-Step Implementation

1. **Add chalk import at top of file:**
   ```typescript
   import chalk from 'chalk';
   ```

2. **Remove logger import:**
   - Delete: `import * as logger from './logger'`

3. **Create formatting constants and utilities** (add after imports):
   ```typescript
   const TERM_WIDTH = 80;
   const DIVIDER = '─'.repeat(TERM_WIDTH);

   function formatSectionHeader(title: string): string {
     return `\n${chalk.cyan.bold(title)}\n${chalk.cyan(DIVIDER)}\n`;
   }
   ```

4. **Update init() function output flow:**

   **Header Section** (replace current "Initializing..." message):
   ```typescript
   console.log(chalk.bold.white('\nAI Task Manager Initialization'));
   console.log(chalk.gray(DIVIDER));
   ```

   **Configuration Section:**
   ```typescript
   console.log(formatSectionHeader('Configuration'));
   console.log(`  ${chalk.cyan('●')} Target Directory: ${resolvedBaseDir}`);
   console.log(`  ${chalk.cyan('●')} Assistants: ${assistants.map(a => chalk.green(a)).join(', ')}`);
   ```

   **Setup Progress Section** (replace existing logger.info calls):
   ```typescript
   console.log(formatSectionHeader('Setup Progress'));
   console.log(`  ${chalk.green('✓')} Created .ai/task-manager directory structure`);
   console.log(`  ${chalk.green('✓')} Copied common template files`);
   // ... for each assistant:
   console.log(`  ${chalk.green('✓')} Configured ${assistant} assistant`);
   ```

   **Created Files Section** (replace existing file listing):
   ```typescript
   console.log(formatSectionHeader('Created Files'));
   console.log(chalk.cyan('  Common Files:'));
   console.log(`    ${chalk.gray('●')} .ai/task-manager/config/TASK_MANAGER.md`);
   // ... list other files with proper indentation and grouping

   for (const assistant of assistants) {
     console.log(chalk.cyan(`  ${assistant.charAt(0).toUpperCase() + assistant.slice(1)} Assistant:`));
     // ... list assistant-specific files
   }
   ```

   **Footer:**
   ```typescript
   console.log('\n' + chalk.gray(DIVIDER));
   console.log(chalk.green('✓ Initialization complete!\n'));
   ```

5. **Replace all logger calls throughout the file:**
   - `await logger.info(...)` → `console.log(chalk.blue(...))`
   - `await logger.success(...)` → `console.log(chalk.green(...))`
   - `await logger.debug(...)` → Keep debug logic but use `console.log(chalk.gray(...))`
   - `await logger.error(...)` → `console.error(chalk.red(...))`

6. **Preserve existing logic:**
   - Keep all directory creation logic
   - Keep all file copying logic
   - Keep all error handling
   - Only change the output statements

### Color Scheme Reference

Based on status.ts and plan.ts patterns:
- **Cyan**: Headers, dividers, section titles, bullets
- **Green**: Success indicators (✓), completion messages
- **Blue**: Informational bullets (●)
- **Gray**: Subtle dividers, secondary text
- **Red**: Errors (in error handling)
- **Yellow**: Warnings (if any)

### Visual Example

```
AI Task Manager Initialization
────────────────────────────────────────────────────────────────────────────────

Configuration
────────────────────────────────────────────────────────────────────────────────

  ● Target Directory: /workspace/test-project
  ● Assistants: claude, gemini

Setup Progress
────────────────────────────────────────────────────────────────────────────────

  ✓ Created .ai/task-manager directory structure
  ✓ Copied common template files
  ✓ Configured claude assistant
  ✓ Configured gemini assistant

Created Files
────────────────────────────────────────────────────────────────────────────────

  Common Files:
    ● .ai/task-manager/config/TASK_MANAGER.md
    ● .ai/task-manager/config/hooks/POST_PHASE.md

  Claude Assistant:
    ● .claude/commands/tasks/create-plan.md
    ● .claude/commands/tasks/execute-blueprint.md

  Gemini Assistant:
    ● .gemini/commands/tasks/create-plan.toml
    ● .gemini/commands/tasks/execute-blueprint.toml

────────────────────────────────────────────────────────────────────────────────
✓ Initialization complete!
```

### Testing

After implementation:
1. Build: `npm run build`
2. Test visually: `npm start init --assistants claude --destination-directory /tmp/test-output`
3. Compare output style with: `npm start status` and `npm start plan 1`
4. Verify all colors and symbols render correctly

### Important Notes

- Do NOT modify the `displayWorkflowHelp()` function in this task - that's handled in Task 3
- Focus only on the main init() function output
- Preserve all async/await patterns where needed
- Keep all error handling try/catch blocks intact
</details>
