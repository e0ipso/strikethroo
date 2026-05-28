---
id: 3
group: "command-template-updates"
dependencies: [1, 2]
status: "completed"
created: "2025-10-08"
skills:
  - markdown
---
# Update create-plan.md Command Template

## Objective
Inject configuration detection and reading logic into the create-plan.md command template to make configuration awareness mandatory during plan creation.

## Skills Required
- **markdown**: Template editing, section insertion, bash code block formatting

## Acceptance Criteria
- [ ] Configuration section added after frontmatter and title in `templates/assistant/commands/tasks/create-plan.md`
- [ ] Section includes bash commands to detect assistant and read configuration
- [ ] Clear directive with "MUST" language emphasizes requirement
- [ ] Horizontal rule separates configuration from existing instructions
- [ ] Existing command functionality preserved (no breaking changes)
- [ ] Injection point is before "Instructions" section

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **File to edit**: `templates/assistant/commands/tasks/create-plan.md`
- **Injection point**: After YAML frontmatter and `# Comprehensive Plan Creation` title, before "You are a comprehensive task planning assistant..." paragraph
- **Pattern to inject**:
  ```markdown
  ## Assistant Configuration

  Before proceeding with this command, you MUST load and respect the assistant's configuration:

  **Run the following scripts:**
  ```bash
  ASSISTANT=$(node .ai/task-manager/config/scripts/detect-assistant.cjs)
  node .ai/task-manager/config/scripts/read-assistant-config.cjs "$ASSISTANT"
  ```

  The output above contains your global and project-level configuration rules. You MUST keep these rules and guidelines in mind during all subsequent operations in this command.

  ---
  ```
- **Preservation**: All existing content after injection point must remain unchanged

## Input Dependencies
- Task 1: detect-assistant.cjs script must exist (referenced in bash commands)
- Task 2: read-assistant-config.cjs script must exist (referenced in bash commands)
- Existing file: `templates/assistant/commands/tasks/create-plan.md`

## Output Artifacts
- Modified `templates/assistant/commands/tasks/create-plan.md` with configuration injection

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Current File Structure

The file currently has:
```markdown
---
argument-hint: [user-prompt]
description: Create a comprehensive plan to accomplish the request from the user.
---
# Comprehensive Plan Creation

Think harder and use tools.

You are a comprehensive task planning assistant...
[rest of content]
```

### Target File Structure

After injection:
```markdown
---
argument-hint: [user-prompt]
description: Create a comprehensive plan to accomplish the request from the user.
---
# Comprehensive Plan Creation

## Assistant Configuration

Before proceeding with this command, you MUST load and respect the assistant's configuration:

**Run the following scripts:**
```bash
ASSISTANT=$(node .ai/task-manager/config/scripts/detect-assistant.cjs)
node .ai/task-manager/config/scripts/read-assistant-config.cjs "$ASSISTANT"
```

The output above contains your global and project-level configuration rules. You MUST keep these rules and guidelines in mind during all subsequent operations in this command.

---

Think harder and use tools.

You are a comprehensive task planning assistant...
[rest of existing content]
```

### Implementation Steps

1. **Read the file**: Load `templates/assistant/commands/tasks/create-plan.md`
2. **Locate injection point**: Find the line "# Comprehensive Plan Creation"
3. **Insert configuration section**: Add the configuration block after the title, before "Think harder and use tools."
4. **Verify structure**: Ensure bash code block is properly formatted
5. **Test syntax**: Verify markdown renders correctly

### Key Points

- **Exact formatting**: Maintain proper markdown syntax (double backticks for bash blocks)
- **MUST language**: Use strong directive language to emphasize requirement
- **Visual separation**: Horizontal rule (---) separates config from instructions
- **Non-breaking**: Existing content flows naturally after injection

### Testing After Implementation

1. **Syntax check**: Render markdown in a viewer to verify formatting
2. **Script execution**: Manually run the bash commands to verify they work
3. **Integration test**: Use the updated command template with `/tasks:create-plan` to verify configuration loads

</details>
