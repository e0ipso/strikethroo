---
id: 9
group: "documentation"
dependencies: [7]
status: "completed"
created: "2025-10-09"
skills:
  - "documentation"
---
# Update Documentation for Conflict Detection

## Objective
Update README and CLAUDE.md documentation to explain the conflict detection feature, --force flag usage, and best practices.

## Skills Required
- **documentation**: Writing clear, user-focused technical documentation

## Acceptance Criteria
- [ ] README.md includes conflict detection feature description
- [ ] --force flag documented with usage examples
- [ ] CLAUDE.md updated with conflict resolution workflow
- [ ] .gitignore recommendation for .init-metadata.json mentioned
- [ ] Migration guide for existing users provided
- [ ] Best practices and troubleshooting section added

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Update README.md in root directory
- Update AGENTS.md (formerly CLAUDE.md) with workflow changes
- Add examples for common scenarios
- Include screenshots or CLI output examples if helpful

## Input Dependencies
- Task 7: Implemented conflict detection functionality

## Output Artifacts
- Updated README.md
- Updated AGENTS.md
- Optional: New MIGRATION.md guide for major version

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Update README.md - Features section**:
   ```markdown
   ## Features

   - **Conflict Detection**: Automatically detects when config files have been
     modified by users and prompts before overwriting
   - **Hash-based Tracking**: Uses SHA-256 hashes to identify file changes
     without git dependency
   - **Interactive Resolution**: Choose to keep or overwrite each modified file
     with unified diff preview
   - **Force Mode**: `--force` flag for automated workflows that skip prompts
   - ... (existing features)
   ```

2. **Update README.md - Usage section**:
   ```markdown
   ## Usage

   ### First-time initialization
   ```bash
   npx @e0ipso/ai-task-manager init --assistants claude
   ```

   ### Re-initialization (updates)
   When running init on an already-initialized project:

   ```bash
   # Interactive mode (default) - prompts for conflicts
   npx @e0ipso/ai-task-manager init --assistants claude

   # Force mode - overwrites without prompting
   npx @e0ipso/ai-task-manager init --assistants claude --force
   ```

   #### Conflict Resolution
   If you've modified config files, you'll see:
   - Unified diff showing your changes vs new version
   - Options: Keep, Overwrite, Keep All, Overwrite All
   - Safe default: Keep your changes
   ```

3. **Add new section: Conflict Detection**:
   ```markdown
   ## Conflict Detection

   AI Task Manager tracks file hashes to detect when config files have been
   modified. This prevents accidental loss of customizations during updates.

   ### How it works
   1. After first init, `.ai/task-manager/.init-metadata.json` stores hashes
   2. On subsequent init, current hashes are compared to stored hashes
   3. If differences detected, you're prompted with a diff view
   4. Choose to keep your changes or accept the update

   ### Files tracked
   All files in `.ai/task-manager/config/` directory:
   - `TASK_MANAGER.md` - Project context
   - `hooks/` - Lifecycle hooks (PRE_PLAN, POST_PHASE, etc.)
   - `templates/` - Task and plan templates

   Files in `config/scripts/` are NOT tracked (these shouldn't be modified).

   ### Metadata file
   The `.init-metadata.json` file is:
   - **Local only**: Should NOT be committed to git (add to .gitignore)
   - **Per-user**: Each developer has their own baseline
   - **Auto-regenerated**: If corrupted or missing, treated as first-time init

   ### Force mode
   Use `--force` for:
   - CI/CD pipelines
   - Automated scripts
   - When you want to reset to package defaults

   **Warning**: `--force` will overwrite ALL config files without confirmation.
   ```

4. **Update AGENTS.md - Development Workflow section**:
   ```markdown
   ## Development Workflow

   ### Updating the Package
   When upgrading to a new version of @e0ipso/ai-task-manager:

   ```bash
   # Update package
   npm update @e0ipso/ai-task-manager

   # Re-run init (will detect conflicts)
   npx @e0ipso/ai-task-manager init --assistants claude

   # Review and resolve any conflicts
   # Your customizations in config/ will be preserved if you choose "Keep"
   ```

   ### Best Practices
   - **Version control**: Commit your `.ai/task-manager/config/` customizations
   - **Local metadata**: Add `.ai/task-manager/.init-metadata.json` to
     `.gitignore`
   - **Review diffs**: Always review the unified diff before choosing to
     overwrite
   - **Backup**: Consider backing up critical customizations before force
     updates
   ```

5. **Add troubleshooting section**:
   ```markdown
   ## Troubleshooting

   ### Conflict detection not working
   - Verify `.init-metadata.json` exists in `.ai/task-manager/`
   - Check file permissions on metadata file
   - Try deleting metadata and re-running init to reset baseline

   ### Metadata file corrupted
   - Delete `.ai/task-manager/.init-metadata.json`
   - Re-run init - will regenerate from current state
   - You may lose conflict detection for next update

   ### Want to reset all config to defaults
   ```bash
   # Backup your customizations first!
   cp -r .ai/task-manager/config .ai/task-manager/config.backup

   # Force reset
   npx @e0ipso/ai-task-manager init --assistants claude --force
   ```

   ### Diff output unclear
   - Diff format: Lines starting with `-` are YOUR version
   - Lines starting with `+` are the NEW version
   - Unchanged lines provide context
   ```

6. **Add migration note** (if this is a major version):
   ```markdown
   ## Migration from 1.x to 2.x

   Version 2.0 introduces conflict detection:
   - First run after upgrade will NOT show conflicts (no metadata yet)
   - Metadata will be created on first 2.x init
   - Future inits will detect and prompt for conflicts
   - No breaking changes to existing functionality
   - Add `.init-metadata.json` to your `.gitignore`
   ```

7. **Update CLI help text**: Ensure `--force` is well-documented in `--help`
   output (already done in task 6).

**Documentation principles**:
- User-focused: Explain "why" not just "what"
- Examples: Show real command-line usage
- Warnings: Highlight data loss risks (--force)
- Troubleshooting: Anticipate common issues

</details>
