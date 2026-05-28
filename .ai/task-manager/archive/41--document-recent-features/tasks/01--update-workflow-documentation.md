---
id: 1
group: "documentation"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - technical-writing
  - markdown
---
# Update docs/workflow.md with New Features

## Objective

Add two new sections to docs/workflow.md documenting the automated workflow command and plan management CLI, plus update Step 6 to mention automatic task generation in execute-blueprint.

## Skills Required

- **technical-writing**: User-facing documentation for CLI tools and workflows
- **markdown**: Jekyll-flavored Markdown with frontmatter and cross-references

## Acceptance Criteria

- [ ] "Automated Workflow" section added after "Daily Development Workflow" intro (before Step 1)
- [ ] Section documents `/tasks:full-workflow` command with usage examples and when to use it
- [ ] "Plan Management Commands" section added after "Keyboard Shortcuts" section
- [ ] Section documents all three CLI commands: show, archive, delete with shorthand notation
- [ ] Step 6 updated to mention automatic task generation in execute-blueprint
- [ ] Cross-references added to features.md using .html format
- [ ] All formatting matches existing style (bash code blocks, bold headers, bullet lists)
- [ ] Total additions approximately 50 lines

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Jekyll Markdown**:
- Use Jekyll-compatible Markdown syntax
- Cross-references use .html extension (e.g., `[Features](features.html)`)
- Code blocks use ```bash syntax highlighting
- Maintain existing frontmatter (layout, title, nav_order, parent, description)

**Style Consistency**:
- Match emoji usage from existing sections
- Use bold for "What happens:" labels
- Use bullet lists for feature descriptions
- Keep sections concise and practical

**Content Sources**:
- Full-workflow command: Review templates/assistant/commands/tasks/full-workflow.md
- Plan CLI commands: Review src/cli.ts for exact syntax
- Auto-generation: Review commit 12e5b1e for behavior

## Input Dependencies

- Existing docs/workflow.md file with current structure
- Git commits 9080aa9, 61eeae3, 2f5f9d6, 12e5b1e for feature details
- templates/assistant/commands/tasks/full-workflow.md for command documentation

## Output Artifacts

- Updated docs/workflow.md with ~50 additional lines
- Two new sections integrated into existing workflow guide
- Updated Step 6 text mentioning automatic task generation

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Add Automated Workflow Section

**Location**: After "Daily Development Workflow" heading (line ~35), before "Step 1: Create a Plan"

**Content Structure**:
```markdown
## Automated Workflow (Alternative)

For a streamlined experience, use the automated workflow command that handles all three phases:

```bash
/tasks:full-workflow Create user authentication with email/password and JWT tokens
```

**What happens:**
- Creates plan with clarification questions (Phase 1)
- Automatically generates tasks (Phase 2)
- Executes blueprint with validation gates (Phase 3)
- Archives completed plan

**When to use:**
- Clear requirements with minimal ambiguity
- Prefer automation over manual review gates
- Quick prototyping or straightforward features

**When to use manual workflow:**
- Complex features needing careful planning review
- Requirements need significant refinement
- Want to review/edit tasks before execution

For the manual workflow, follow the step-by-step process below.
```

### Step 2: Update Step 6

**Location**: Find "Step 6: Execute the Blueprint" section (around line 113)

**Add this note** after the "What happens:" bullet list, before "Step 7":

```markdown
**Note**: If you forgot to run `/tasks:generate-tasks`, execute-blueprint will automatically generate tasks and the blueprint for you before starting execution.
```

### Step 3: Add Plan Management Commands Section

**Location**: After "Keyboard Shortcuts" section (around line 299), before "Next Steps"

**Content Structure**:
```markdown
## Plan Management Commands

Inspect and manage plans using CLI commands:

```bash
# View plan details and progress
npx @e0ipso/ai-task-manager plan show 41
npx @e0ipso/ai-task-manager plan 41  # shorthand

# Move completed plan to archive
npx @e0ipso/ai-task-manager plan archive 41

# Permanently delete a plan
npx @e0ipso/ai-task-manager plan delete 41
```

**plan show** displays:
- Plan metadata (ID, summary, creation date)
- Executive summary excerpt
- Task progress (completed/total tasks)
- Plan location in filesystem

**plan archive** moves the entire plan directory from `plans/` to `archive/` while preserving all tasks and history.

**plan delete** permanently removes the plan and all associated tasks. Use with caution.

See [Features](features.html) for more details on plan management capabilities.
```

### Step 4: Verify Formatting

- Ensure all code blocks use ```bash
- Verify cross-references use .html format
- Check that section headings match hierarchy (##, ###)
- Confirm bullet list formatting is consistent
- Verify no trailing spaces on any lines

</details>
