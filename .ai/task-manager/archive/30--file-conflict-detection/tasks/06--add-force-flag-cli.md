---
id: 6
group: "cli-integration"
dependencies: [2]
status: "completed"
created: "2025-10-09"
skills:
  - "typescript"
---
# Add --force Flag to CLI

## Objective
Add `--force` option to the init command in CLI to allow bypassing interactive prompts and overwriting all files.

## Skills Required
- **typescript**: Modifying CLI command definitions using Commander.js

## Acceptance Criteria
- [ ] `--force` flag added to init command definition
- [ ] Flag is optional (boolean)
- [ ] Help text explains the flag's purpose
- [ ] Flag value is passed through to InitOptions
- [ ] TypeScript compilation succeeds

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Modify `src/cli.ts` to add the option
- Use Commander.js `.option()` method
- Update help text to document the flag
- Ensure flag is properly typed in InitOptions

## Input Dependencies
- Task 2: InitOptions interface with force field

## Output Artifacts
- Updated `src/cli.ts` with `--force` option
- Updated help text for init command

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Locate the init command definition in src/cli.ts**:
   Find the existing `.command('init')` definition.

2. **Add the --force option**:
   ```typescript
   program
     .command('init')
     .description('Initialize AI Task Manager in a project')
     .requiredOption(
       '--assistants <assistants>',
       'Comma-separated list of assistants (claude,gemini,opencode)'
     )
     .option(
       '--destination-directory <path>',
       'Destination directory for initialization',
       '.'
     )
     .option(
       '--force',
       'Force overwrite all files without prompting for conflicts'
     )
     .action(async (options) => {
       // Existing action code...
       const result = await init({
         assistants: options.assistants,
         destinationDirectory: options.destinationDirectory,
         force: options.force || false,  // <-- Pass force flag
       });
       // ...
     });
   ```

3. **Update help text in displayWorkflowHelp()** (if applicable):
   Consider adding a note about `--force` in the workflow help:
   ```typescript
   console.log('Pro tip: Use --force flag to skip conflict prompts in automation');
   ```

4. **Test the flag parsing**:
   ```bash
   # Should show help with --force option
   npm run build && node dist/cli.js init --help

   # Should parse correctly
   node dist/cli.js init --assistants claude --force
   ```

**Implementation notes**:
- Boolean flags in Commander.js default to `false` when not provided
- No need for `=true` syntax, just `--force` presence is enough
- Flag should come before or after other options (order independent)

**Documentation requirements**:
- Help text should clearly state that --force bypasses conflict resolution
- Useful for CI/CD pipelines and automated scripts
- Warn that it will overwrite user modifications without confirmation

</details>
