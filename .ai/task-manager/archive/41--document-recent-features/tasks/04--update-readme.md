---
id: 4
group: "documentation"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - technical-writing
  - markdown
---
# Update README.md with Full-Workflow and Plan Management

## Objective

Update README.md to mention the full-workflow command as an alternative in the workflow preview section and add plan management to the key benefits list.

## Skills Required

- **technical-writing**: Concise README documentation
- **markdown**: GitHub-flavored Markdown with badges and links

## Acceptance Criteria

- [ ] "Workflow Preview" section updated to show both manual and automated approaches
- [ ] Full-workflow command included as an alternative with `/tasks:full-workflow` example
- [ ] "Key Benefits" section updated to mention plan inspection and management
- [ ] Emoji and formatting style matches existing README content
- [ ] Total additions approximately 10 lines
- [ ] All documentation links remain valid

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**GitHub README Style**:
- Concise, scannable content
- Use emoji for visual hierarchy
- Code blocks with `bash` syntax highlighting
- Links to full documentation site

**Formatting Consistency**:
- Match existing emoji usage in benefits list
- Follow existing numbered list format for workflow
- Maintain table formatting if present
- Keep changes minimal and focused

**Content Guidelines**:
- Present both workflows without favoring one
- Keep descriptions brief (README is overview, not detailed guide)
- Use existing terminology and phrasing patterns

## Input Dependencies

- Existing README.md file with current structure
- Understanding of target audience (users discovering the tool)
- Knowledge of full-workflow and plan commands

## Output Artifacts

- Updated README.md with ~10 additional lines
- Enhanced workflow preview showing both approaches
- Updated key benefits mentioning plan management

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Update Workflow Preview Section

**Location**: Find "## 🔄 Workflow Preview" section (around line 42)

**Replace existing numbered list** with enhanced version showing both approaches:

```markdown
## 🔄 Workflow Preview

**Automated Workflow (Recommended for Beginners):**
```bash
/tasks:full-workflow Create user authentication system
```

**Manual Workflow (Full Control):**
1. **📝 Create a plan** → `/tasks:create-plan Create user authentication system`
2. **📋 Generate tasks** → `/tasks:generate-tasks 1`
3. **🚀 Execute blueprint** → `/tasks:execute-blueprint 1`
4. **📊 Monitor progress** → `npx @e0ipso/ai-task-manager status`
5. **🗂️ Manage plans** → `npx @e0ipso/ai-task-manager plan show 1`
```

**Rationale**: Present automated as "Recommended for Beginners" to guide new users, but include manual workflow for power users who want control.

### Step 2: Update Key Benefits Section

**Location**: Find "## ✨ Key Benefits" section (around line 24)

**Add new bullet** after "🔄 Plan Mode Integration" and before "💰 Works Within Subscriptions":

```markdown
- **📊 Plan Inspection & Management**: View progress, archive completed work, and manage plans via CLI
```

**Rationale**: Highlights the new CLI capabilities without over-emphasizing them (they're complementary features, not the main value prop).

### Step 3: Verify README Quality

- Ensure emoji usage is consistent with existing bullets
- Verify code blocks use ```bash
- Check that workflow section presents both options clearly
- Confirm total line additions are minimal (~10 lines)
- Verify all links still point to documentation site
- Check that formatting matches existing style (spacing, bullets, numbering)

### Step 4: Final Review

Read the entire README to ensure:
- Flow is natural and scannable
- New content doesn't disrupt existing narrative
- Both workflows are presented without bias
- Benefits list remains focused and impactful
- Total README length stays concise

</details>
