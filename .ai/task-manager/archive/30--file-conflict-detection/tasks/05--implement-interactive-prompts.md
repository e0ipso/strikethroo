---
id: 5
group: "user-interface"
dependencies: [1, 4]
status: "completed"
created: "2025-10-09"
skills:
  - "typescript"
  - "cli-ux"
---
# Implement Interactive Conflict Resolution Prompts

## Objective
Create interactive prompts using inquirer that display unified diffs and allow users to choose how to resolve each file conflict.

## Skills Required
- **typescript**: Implementing async prompt logic with inquirer library
- **cli-ux**: Designing clear, intuitive command-line user interfaces

## Acceptance Criteria
- [ ] `promptConflictResolution()` function displays conflicts with unified diff
- [ ] User can choose: Keep, Overwrite, Keep All, Overwrite All
- [ ] Diff output uses unified format (like git diff)
- [ ] Diff is syntax-highlighted using chalk
- [ ] "Keep All" and "Overwrite All" apply to remaining conflicts
- [ ] Clear messaging explains what will happen with each choice

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Use `inquirer` for interactive prompts
- Use `diff` package for unified diff generation
- Use `chalk` (existing dependency) for colored output
- Handle both single-file and batch conflict resolution

## Input Dependencies
- Task 1: inquirer and diff packages installed
- Task 4: `FileConflict` objects from conflict detection
- Task 2: `ConflictResolution` type definition

## Output Artifacts
- `promptConflictResolution()` function in `src/prompts.ts` or `src/utils.ts`
- Returns user's choice for each file

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Create unified diff generation function**:
   ```typescript
   import * as Diff from 'diff';
   import chalk from 'chalk';

   /**
    * Generate and format unified diff for display
    */
   function generateUnifiedDiff(
     userContent: string,
     newContent: string,
     filename: string
   ): string {
     const patch = Diff.createPatch(
       filename,
       userContent,
       newContent,
       'Your version',
       'New version'
     );

     // Apply syntax highlighting
     const lines = patch.split('\n');
     const coloredLines = lines.map(line => {
       if (line.startsWith('---') || line.startsWith('+++')) {
         return chalk.bold(line);
       } else if (line.startsWith('-')) {
         return chalk.red(line);
       } else if (line.startsWith('+')) {
         return chalk.green(line);
       } else if (line.startsWith('@@')) {
         return chalk.cyan(line);
       }
       return line;
     });

     return coloredLines.join('\n');
   }
   ```

2. **Create interactive prompt function**:
   ```typescript
   import inquirer from 'inquirer';

   /**
    * Prompt user to resolve file conflicts
    * @param conflicts - Array of detected conflicts
    * @returns Map of file path to user's resolution choice
    */
   export async function promptConflictResolution(
     conflicts: FileConflict[]
   ): Promise<Map<string, ConflictResolution>> {
     const resolutions = new Map<string, ConflictResolution>();
     let batchChoice: ConflictResolution | null = null;

     for (const conflict of conflicts) {
       // If user chose "keep all" or "overwrite all", apply to remaining
       if (batchChoice) {
         resolutions.set(conflict.relativePath, batchChoice);
         continue;
       }

       // Display conflict information
       console.log('\n' + chalk.yellow('═'.repeat(60)));
       console.log(chalk.yellow.bold(`\n⚠️  File Conflict Detected\n`));
       console.log(chalk.white(`File: ${chalk.bold(conflict.relativePath)}`));
       console.log(chalk.white(`Your changes will be lost if you overwrite.\n`));

       // Show unified diff
       const diff = generateUnifiedDiff(
         conflict.userFileContent,
         conflict.newFileContent,
         conflict.relativePath
       );
       console.log(diff);
       console.log('\n' + chalk.yellow('═'.repeat(60)) + '\n');

       // Prompt for user choice
       const answer = await inquirer.prompt([
         {
           type: 'list',
           name: 'resolution',
           message: 'What would you like to do?',
           choices: [
             {
               name: 'Keep my changes (skip update)',
               value: 'keep' as ConflictResolution,
             },
             {
               name: 'Overwrite with new version',
               value: 'overwrite' as ConflictResolution,
             },
             {
               name: 'Keep my changes for ALL remaining conflicts',
               value: 'keep-all' as ConflictResolution,
             },
             {
               name: 'Overwrite ALL remaining conflicts',
               value: 'overwrite-all' as ConflictResolution,
             },
           ],
           default: 'keep',
         },
       ]);

       const choice = answer.resolution as ConflictResolution;

       // Handle batch choices
       if (choice === 'keep-all') {
         batchChoice = 'keep';
         resolutions.set(conflict.relativePath, 'keep');
       } else if (choice === 'overwrite-all') {
         batchChoice = 'overwrite';
         resolutions.set(conflict.relativePath, 'overwrite');
       } else {
         resolutions.set(conflict.relativePath, choice);
       }
     }

     return resolutions;
   }
   ```

3. **Add summary display function**:
   ```typescript
   /**
    * Display summary of conflict resolutions
    */
   export function displayResolutionSummary(
     resolutions: Map<string, ConflictResolution>
   ): void {
     const kept: string[] = [];
     const overwritten: string[] = [];

     for (const [path, resolution] of resolutions) {
       if (resolution === 'keep') {
         kept.push(path);
       } else {
         overwritten.push(path);
       }
     }

     console.log('\n' + chalk.blue('═'.repeat(60)));
     console.log(chalk.blue.bold('Resolution Summary\n'));

     if (kept.length > 0) {
       console.log(chalk.green('✓ Kept your changes:'));
       kept.forEach(p => console.log(chalk.green(`  - ${p}`)));
       console.log();
     }

     if (overwritten.length > 0) {
       console.log(chalk.yellow('⚠ Overwritten with new version:'));
       overwritten.forEach(p => console.log(chalk.yellow(`  - ${p}`)));
       console.log();
     }

     console.log(chalk.blue('═'.repeat(60)) + '\n');
   }
   ```

**UX considerations**:
- **Clear visual separation**: Use box characters and colors to separate conflicts
- **Safe defaults**: Default to "keep" to prevent accidental data loss
- **Batch operations**: Allow "all" choices to speed up multiple conflicts
- **Informative diffs**: Show enough context (default 3 lines) for understanding changes

</details>
