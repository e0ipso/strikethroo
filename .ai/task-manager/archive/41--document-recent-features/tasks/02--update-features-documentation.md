---
id: 2
group: "documentation"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - technical-writing
  - markdown
---
# Update docs/features.md with New Feature Sections

## Objective

Add "Workflow Automation" and "Plan Management CLI" sections to docs/features.md, and update the existing "Workflow Orchestration" section to mention automatic task generation.

## Skills Required

- **technical-writing**: Feature documentation with user benefits focus
- **markdown**: Jekyll Markdown with emoji headers and code blocks

## Acceptance Criteria

- [ ] "Workflow Automation" section added after "Workflow Orchestration" section
- [ ] Section documents `/tasks:full-workflow` command with benefits and use cases
- [ ] "Plan Management CLI" section added after "Progress Monitoring & Dashboard" section
- [ ] Section documents all three plan subcommands with usage patterns
- [ ] "Workflow Orchestration" section updated to mention automatic task generation
- [ ] Cross-reference to workflow.md added using .html format
- [ ] Emoji and heading patterns match existing sections (##, ###, 🔧 style)
- [ ] Code blocks use `bash` syntax highlighting
- [ ] Total additions approximately 30 lines

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Jekyll Markdown with Emoji**:
- Use emoji in section headers (e.g., ## 🚀)
- Maintain existing heading hierarchy (##, ###)
- Code blocks with ```bash syntax highlighting
- Cross-references use .html format

**Style Consistency**:
- Match bold usage for feature labels
- Use bullet lists for capability descriptions
- Keep descriptions concise and benefit-focused
- Include "Usage:" or "Features:" subsections

**Content Sources**:
- Full-workflow: templates/assistant/commands/tasks/full-workflow.md
- Plan commands: src/cli.ts for command signatures
- Auto-generation: templates/assistant/commands/tasks/execute-blueprint.md

## Input Dependencies

- Existing docs/features.md file with current section structure
- Git commits for feature implementation details
- Understanding of features' user benefits (not technical implementation)

## Output Artifacts

- Updated docs/features.md with ~30 additional lines
- Two new feature sections integrated into existing document
- Updated "Workflow Orchestration" section with auto-generation mention

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Add Workflow Automation Section

**Location**: After "Workflow Orchestration" section (around line 86), before "Task Management"

**Content Structure**:
```markdown
## 🚀 Workflow Automation

### Automated End-to-End Execution

For streamlined development, the full-workflow command automates all three phases:

```bash
/tasks:full-workflow Create user authentication system with JWT tokens
```

**Benefits:**
- **Single Command**: Entire workflow from plan to execution
- **Reduced Friction**: No manual phase transitions
- **Faster Iteration**: Ideal for clear requirements
- **Automatic Archival**: Completed plans moved to archive

**Use Cases:**
- Quick prototyping and proof-of-concepts
- Well-defined features with clear scope
- Reducing cognitive load during development
- Onboarding new users to the workflow

**Manual vs Automated:**
- Use automated workflow for straightforward implementations
- Use manual workflow (step-by-step) for complex features needing review

**Learn more**: See the [Workflow Guide](workflow.html) for detailed usage examples.
```

### Step 2: Add Plan Management CLI Section

**Location**: After "Progress Monitoring & Dashboard" section (around line 117), before "Workspace Management"

**Content Structure**:
```markdown
## 📊 Plan Management CLI

### Inspect and Manage Plans

Command-line tools for plan inspection and lifecycle management:

```bash
# View plan details
npx @e0ipso/ai-task-manager plan show 41
npx @e0ipso/ai-task-manager plan 41  # shorthand

# Archive completed plan
npx @e0ipso/ai-task-manager plan archive 41

# Delete plan permanently
npx @e0ipso/ai-task-manager plan delete 41
```

**Features:**
- **Plan Inspection**: View metadata, progress, and executive summary
- **Manual Archival**: Move completed plans from active to archive directory
- **Plan Deletion**: Permanently remove plans and all associated tasks
- **Shorthand Syntax**: `plan <id>` defaults to `plan show <id>`

**Benefits:**
- No manual file system navigation required
- Consistent interface across all plan operations
- Progress visibility without opening files
- Clean workspace management

**Learn more**: See the [Workflow Guide](workflow.html) for integrated usage patterns.
```

### Step 3: Update Workflow Orchestration Section

**Location**: Find "### Progressive Refinement Benefits" (around line 80)

**Add this bullet** to the existing list:
```markdown
- **Automatic Task Generation**: execute-blueprint auto-generates tasks if missing, reducing manual steps
```

### Step 4: Verify Consistency

- Check emoji usage matches existing sections
- Verify all code blocks use ```bash
- Confirm cross-references use .html format
- Ensure heading hierarchy is correct (##, ###)
- Verify "Benefits:" and "Features:" subsections are bolded
- Check that line length and formatting match surrounding content

</details>
