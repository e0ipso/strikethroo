---
id: 3
group: output-formatting
dependencies:
  - 2
status: completed
created: 2025-10-20T00:00:00.000Z
skills:
  - typescript
  - cli-formatting
---
# Redesign Workflow Help Display

## Objective

Completely redesign the `displayWorkflowHelp()` function in `src/index.ts` to match the modern aesthetic established by status and plan commands, replacing elaborate box-drawing with clean chalk-formatted section headers while preserving all instructional content.

## Skills Required

- **typescript**: Modify TypeScript function implementation
- **cli-formatting**: Design terminal output with chalk and proper visual hierarchy

## Acceptance Criteria

- [ ] Rewrite `displayWorkflowHelp()` function using chalk and formatSectionHeader()
- [ ] Replace box-drawing characters with clean section headers
- [ ] Use cyan for headers, gray for dividers and subtle text
- [ ] Apply visual indicators (●, ✓) consistently with other sections
- [ ] Maintain all workflow information (one-time setup, automated workflow, manual workflow)
- [ ] Preserve step-by-step instructions with proper numbering
- [ ] Improve readability with appropriate spacing and indentation
- [ ] Match visual style of status/plan commands
- [ ] Footer tip remains clear and helpful

## Technical Requirements

**File modifications:**
- `src/index.ts`: Rewrite `displayWorkflowHelp()` function (lines 384-442)

**Use existing formatting utilities** (created in Task 2):
- `formatSectionHeader()` function
- `TERM_WIDTH` constant
- `chalk` import

**Content sections to preserve:**
1. Main header: "Suggested Workflow"
2. One-Time Setup section with config location
3. Automated Workflow section with explanation of what it does
4. Manual Workflow section with 7-step numbered guide
5. Footer pro tip

## Input Dependencies

**Depends on Task 2:**
- Requires `formatSectionHeader()` function to be available
- Requires `TERM_WIDTH` constant to be defined
- Requires `chalk` to be imported
- Should follow the same visual patterns established in Task 2

## Output Artifacts

- Redesigned `displayWorkflowHelp()` function
- Consistent visual aesthetic across all init command output
- Improved readability while maintaining all information

<details>
<summary>Implementation Notes</summary>

### Current State Analysis

The current `displayWorkflowHelp()` function (lines 384-442) uses:
- Complex box-drawing: `╔═══╗`, `┌─┐`, `└┘`
- Plain console.log statements
- Manual width calculations and padding
- Elaborate visual borders

### Target State

Replace with:
- `formatSectionHeader()` for clean headers
- Chalk colors for visual hierarchy
- Simple bullets and indicators
- Clean spacing without heavy borders

### Step-by-Step Implementation

1. **Replace function signature and initial setup:**
   ```typescript
   async function displayWorkflowHelp(): Promise<void> {
     console.log(formatSectionHeader('Suggested Workflow'));
   }
   ```

2. **One-Time Setup Section:**
   ```typescript
   console.log(chalk.cyan('  One-Time Setup'));
   console.log(chalk.gray('  ─'.repeat(40)));
   console.log('');
   console.log('  Review and customize configuration:');
   console.log(`    ${chalk.blue('●')} .ai/task-manager/config/`);
   console.log('');
   ```

3. **Automated Workflow Section:**
   ```typescript
   console.log(chalk.cyan('  Automated Workflow') + chalk.gray(' (Recommended for Simple Tasks)'));
   console.log(chalk.gray('  ─'.repeat(40)));
   console.log('');
   console.log('  This automatically:');
   console.log(`    ${chalk.green('✓')} Creates the plan (with clarification prompts)`);
   console.log(`    ${chalk.green('✓')} Generates tasks`);
   console.log(`    ${chalk.green('✓')} Executes the blueprint`);
   console.log(`    ${chalk.green('✓')} Archives the completed plan`);
   console.log('');
   console.log(`  ${chalk.gray('Best for:')} Straightforward implementations`);
   console.log('');
   ```

4. **Manual Workflow Section:**
   ```typescript
   console.log(chalk.cyan('  Manual Workflow') + chalk.gray(' (Recommended for Complex Tasks)'));
   console.log(chalk.gray('  ─'.repeat(40)));
   console.log('');
   console.log(`  ${chalk.blue('1.')} Create a plan:`);
   console.log(`      /tasks:create-plan ${chalk.gray('Create an authentication...')}`);
   console.log('');
   console.log(`  ${chalk.blue('2.')} Provide additional context if needed`);
   console.log('');
   console.log(`  ${chalk.blue('3.')} ${chalk.yellow('REVIEW THE PLAN')} (don't skip!)`);
   console.log(`      ${chalk.gray('Find it in:')} .ai/task-manager/plans/01--*/plan-*.md`);
   console.log('');
   console.log(`  ${chalk.blue('4.')} Generate tasks:`);
   console.log(`      /tasks:generate-tasks ${chalk.gray('1')}`);
   console.log('');
   console.log(`  ${chalk.blue('5.')} ${chalk.yellow('REVIEW TASKS')} (avoid scope creep!)`);
   console.log(`      ${chalk.gray('Find them in:')} .ai/task-manager/plans/01--*/tasks/`);
   console.log('');
   console.log(`  ${chalk.blue('6.')} Execute the blueprint:`);
   console.log(`      /tasks:execute-blueprint ${chalk.gray('1')}`);
   console.log('');
   console.log(`  ${chalk.blue('7.')} Review implementation and tests`);
   console.log('');
   ```

5. **Footer Pro Tip:**
   ```typescript
   console.log(chalk.gray('  ─'.repeat(40)));
   console.log(chalk.yellow('\n  Pro tip:') + ' Manual review steps are crucial for success!\n');
   ```

### Complete Redesigned Function

```typescript
async function displayWorkflowHelp(): Promise<void> {
  console.log(formatSectionHeader('Suggested Workflow'));

  // One-Time Setup
  console.log(chalk.cyan('  One-Time Setup'));
  console.log(chalk.gray('  ─'.repeat(40)));
  console.log('');
  console.log('  Review and customize configuration:');
  console.log(`    ${chalk.blue('●')} .ai/task-manager/config/`);
  console.log('');

  // Automated Workflow
  console.log(chalk.cyan('  Automated Workflow') + chalk.gray(' (Recommended for Simple Tasks)'));
  console.log(chalk.gray('  ─'.repeat(40)));
  console.log('');
  console.log('  This automatically:');
  console.log(`    ${chalk.green('✓')} Creates the plan (with clarification prompts)`);
  console.log(`    ${chalk.green('✓')} Generates tasks`);
  console.log(`    ${chalk.green('✓')} Executes the blueprint`);
  console.log(`    ${chalk.green('✓')} Archives the completed plan`);
  console.log('');
  console.log(`  ${chalk.gray('Best for:')} Straightforward implementations`);
  console.log('');

  // Manual Workflow
  console.log(chalk.cyan('  Manual Workflow') + chalk.gray(' (Recommended for Complex Tasks)'));
  console.log(chalk.gray('  ─'.repeat(40)));
  console.log('');
  console.log(`  ${chalk.blue('1.')} Create a plan:`);
  console.log(`      /tasks:create-plan ${chalk.gray('Create an authentication...')}`);
  console.log('');
  console.log(`  ${chalk.blue('2.')} Provide additional context if needed`);
  console.log('');
  console.log(`  ${chalk.blue('3.')} ${chalk.yellow('REVIEW THE PLAN')} (don't skip!)`);
  console.log(`      ${chalk.gray('Find it in:')} .ai/task-manager/plans/01--*/plan-*.md`);
  console.log('');
  console.log(`  ${chalk.blue('4.')} Generate tasks:`);
  console.log(`      /tasks:generate-tasks ${chalk.gray('1')}`);
  console.log('');
  console.log(`  ${chalk.blue('5.')} ${chalk.yellow('REVIEW TASKS')} (avoid scope creep!)`);
  console.log(`      ${chalk.gray('Find them in:')} .ai/task-manager/plans/01--*/tasks/`);
  console.log('');
  console.log(`  ${chalk.blue('6.')} Execute the blueprint:`);
  console.log(`      /tasks:execute-blueprint ${chalk.gray('1')}`);
  console.log('');
  console.log(`  ${chalk.blue('7.')} Review implementation and tests`);
  console.log('');

  // Footer
  console.log(chalk.gray('  ─'.repeat(40)));
  console.log(chalk.yellow('\n  Pro tip:') + ' Manual review steps are crucial for success!\n');
}
```

### Color Scheme

- **Cyan**: Section headers, main titles
- **Blue**: Step numbers, informational bullets
- **Green**: Success checkmarks in automated workflow
- **Yellow**: Important callouts (REVIEW steps, pro tip)
- **Gray**: Dividers, secondary text, file paths

### Content Verification Checklist

Ensure all original content is preserved:
- [ ] One-time setup section mentions config directory
- [ ] Automated workflow explains all 4 automatic steps
- [ ] Automated workflow notes best use case
- [ ] Manual workflow has all 7 steps numbered
- [ ] Manual workflow emphasizes review steps (3 and 5)
- [ ] Manual workflow shows example command syntax
- [ ] Manual workflow includes file path hints
- [ ] Pro tip about manual review importance

### Visual Comparison Goal

The new output should feel like it belongs to the same family as:
- Status command's clean section headers
- Plan command's structured information display
- Modern CLI tools with thoughtful typography

Avoid:
- Heavy box-drawing borders
- Excessive visual noise
- Inconsistent spacing
- Different color schemes from other commands

### Testing

After implementation:
1. Build: `npm run build`
2. Run init and scroll to workflow help: `npm start init --assistants claude --destination-directory /tmp/test-help`
3. Verify all content is preserved and readable
4. Check color rendering in terminal
5. Compare visual style with status/plan output

### Important Notes

- This function is called at the end of the init() function
- It's the last output the user sees, so it should feel polished
- The workflow information is critical for user success - don't omit any steps
- Maintain the helpful, educational tone while improving visuals
</details>
