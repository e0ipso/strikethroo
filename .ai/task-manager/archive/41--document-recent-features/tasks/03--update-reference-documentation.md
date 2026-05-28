---
id: 3
group: "documentation"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - technical-writing
  - markdown
---
# Update docs/reference.md with CLI Commands Reference

## Objective

Add a comprehensive CLI Commands reference section to docs/reference.md documenting the plan command with all three subcommands, syntax, and practical examples.

## Skills Required

- **technical-writing**: Reference documentation for CLI commands
- **markdown**: Jekyll Markdown with code syntax and cross-references

## Acceptance Criteria

- [ ] "CLI Commands" section added after "Key Differentiators" section
- [ ] Section documents `npx @e0ipso/ai-task-manager plan` with all subcommands
- [ ] Syntax, descriptions, and shorthand notation included for each subcommand
- [ ] Practical examples provided for show, archive, and delete commands
- [ ] Cross-reference to workflow.md added using .html format
- [ ] Reference documentation style maintained (concise, syntax-focused)
- [ ] Total additions approximately 20 lines

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Reference Documentation Style**:
- Concise syntax descriptions
- Command signatures with placeholders (e.g., `<plan-id>`)
- Brief but clear descriptions of each command's purpose
- Practical usage examples

**Jekyll Markdown**:
- Code blocks with ```bash syntax highlighting
- Cross-references use .html format
- Maintain existing frontmatter structure
- Follow existing heading hierarchy (##, ###)

**Content Accuracy**:
- Verify command syntax against src/cli.ts implementation
- Confirm shorthand behavior (plan <id> → plan show <id>)
- Ensure all three subcommands documented: show, archive, delete

## Input Dependencies

- Existing docs/reference.md file with current structure
- src/cli.ts for exact command signatures and descriptions
- Understanding of CLI command behavior

## Output Artifacts

- Updated docs/reference.md with ~20 additional lines
- New "CLI Commands" section integrated into reference documentation
- Syntax reference for plan management commands

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Add CLI Commands Section

**Location**: After "Key Differentiators" section (around line 35), before "When to Use AI Task Manager"

**Content Structure**:
```markdown
## CLI Commands

### Plan Management

Command-line interface for inspecting and managing plans:

```bash
npx @e0ipso/ai-task-manager plan <subcommand> <plan-id>
```

**Subcommands:**

**`plan show <plan-id>`** or **`plan <plan-id>`** (shorthand)
Display plan metadata, executive summary, and task progress.

```bash
npx @e0ipso/ai-task-manager plan show 41
npx @e0ipso/ai-task-manager plan 41  # shorthand
```

**`plan archive <plan-id>`**
Move a completed plan from `plans/` directory to `archive/` directory.

```bash
npx @e0ipso/ai-task-manager plan archive 41
```

**`plan delete <plan-id>`**
Permanently delete a plan and all associated tasks. Cannot be undone.

```bash
npx @e0ipso/ai-task-manager plan delete 41
```

**Usage Notes:**
- Plan ID must be numeric
- Commands work on both active plans (in `plans/`) and archived plans (in `archive/`)
- Shorthand `plan <id>` defaults to `plan show <id>` for convenience

See [Workflow Guide](workflow.html) for integrated workflow usage examples.
```

### Step 2: Verify Reference Style

- Ensure command signatures use `<placeholders>` for required arguments
- Confirm descriptions are concise (1-2 sentences maximum)
- Verify all code blocks use ```bash
- Check that cross-references use .html format
- Ensure proper spacing between command definitions
- Verify "Usage Notes:" section is clear and actionable

### Step 3: Cross-Check with Implementation

Read src/cli.ts to verify:
- Command signatures match exactly
- Subcommand names are correct (show, archive, delete)
- Descriptions align with actual behavior
- Shorthand behavior is accurately documented

</details>
