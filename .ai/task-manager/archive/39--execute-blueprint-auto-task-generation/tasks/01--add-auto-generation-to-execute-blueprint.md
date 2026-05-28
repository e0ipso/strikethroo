---
id: 1
group: "template-modification"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - markdown
---
# Add Automatic Task Generation to Execute-Blueprint Template

## Objective

Modify the execute-blueprint.md template to automatically generate tasks and execution blueprint when they are missing, by adding validation logic, updating error handling documentation, and updating the example todo list.

## Skills Required

- **markdown**: Template editing and Markdown formatting

## Acceptance Criteria

- [ ] New "Task and Blueprint Validation" section added after line 37 with bash commands and SlashCommand invocation
- [ ] Input Error Handling section (lines 36-37) updated to reflect auto-generation behavior
- [ ] Example todo list updated with validation/generation step
- [ ] All Markdown formatting follows existing template patterns
- [ ] No syntax errors in bash commands or Markdown structure

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to modify**: `templates/assistant/commands/tasks/execute-blueprint.md`

**Three specific modifications**:

1. **Insert new section after line 37** (before "## Execution Process"):
   - Section title: "### Task and Blueprint Validation"
   - Include bash commands to locate plan, check tasks existence, check blueprint existence
   - Add SlashCommand invocation pattern matching full-workflow.md
   - Include brief notification message and error handling

2. **Update lines 36-37** (Input Error Handling section):
   - Change from erroring on missing blueprint to auto-generating
   - Keep error for missing plan
   - Add note about automatic generation

3. **Update example todo list** (around line 43):
   - Add new step: "Validate or auto-generate tasks and execution blueprint if missing"
   - Insert after "Create feature branch" and before first "Execute PRE_PHASE.md" step

## Input Dependencies

- Current execute-blueprint.md template at templates/assistant/commands/tasks/execute-blueprint.md:1-131
- Reference pattern from full-workflow.md for SlashCommand usage (lines 55-96)
- TASK_MANAGER.md find command pattern for locating plans

## Output Artifacts

- Modified execute-blueprint.md with all three changes applied
- Template ready for conversion to all three assistant formats (Claude .md, Gemini .toml, OpenCode .md)

## Implementation Notes

<details>
<summary>Detailed implementation instructions</summary>

### Step 1: Read the current template

Read `templates/assistant/commands/tasks/execute-blueprint.md` to understand current structure.

### Step 2: Add Task and Blueprint Validation section

Insert after line 37, before "## Execution Process":

```markdown
### Task and Blueprint Validation

Before proceeding with execution, validate that tasks exist and the execution blueprint has been generated. If either is missing, automatically invoke task generation.

**Validation Steps:**

1. **Locate the plan document**:
```bash
PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-[0-9][0-9]*--*.md" -type f -exec grep -l "^id: \?$1$" {} \;)
PLAN_DIR=$(dirname "$PLAN_FILE")
```

2. **Check for task files**:
```bash
TASK_COUNT=$(ls "$PLAN_DIR"/tasks/*.md 2>/dev/null | wc -l)
```

3. **Check for execution blueprint section**:
```bash
BLUEPRINT_EXISTS=$(grep -q "^## Execution Blueprint" "$PLAN_FILE" && echo "yes" || echo "no")
```

4. **Automatic task generation**:

If either `$TASK_COUNT` is 0 or `$BLUEPRINT_EXISTS` is "no":
   - Display notification to user: "⚠️ Tasks or execution blueprint not found. Generating tasks automatically..."
   - Use the SlashCommand tool to invoke task generation:
   ```
   /tasks:generate-tasks $1
   ```
   - If generation fails: Halt execution with clear error message:
     ```
     ❌ Error: Automatic task generation failed.

     Please run the following command manually to generate tasks:
     /tasks:generate-tasks $1
     ```

**After successful validation or generation**, proceed with the execution process below.
```

### Step 3: Update Input Error Handling section

Replace lines 36-37 with:

```markdown
### Input Error Handling

If the plan does not exist, stop immediately and show an error to the user.

**Note**: If tasks or the execution blueprint section are missing, they will be automatically generated before execution begins (see Task and Blueprint Validation below).
```

### Step 4: Update Example Todo List

In the "Execution Process" section, locate the example todo list (around line 41-54). After the line:
```markdown
- [ ] Create feature branch from the main branch.
```

Insert this new item:
```markdown
- [ ] Validate or auto-generate tasks and execution blueprint if missing.
```

So the updated list starts with:
```markdown
- [ ] Create feature branch from the main branch.
- [ ] Validate or auto-generate tasks and execution blueprint if missing.
- [ ] Execute .ai/task-manager/config/hooks/PRE_PHASE.md hook before Phase 1.
```

### Step 5: Verify formatting

- Ensure consistent indentation (match existing template)
- Verify bash code blocks use triple backticks
- Check that $1 variable references are correct
- Ensure SlashCommand invocation follows existing patterns
- No trailing spaces
- File ends with newline

### Important Notes

- Follow the exact Markdown formatting patterns from the existing template
- Use the same bash command style as TASK_MANAGER.md for finding plans
- Match the SlashCommand invocation style from full-workflow.md (lines 55, 81, 92)
- Brief notification message should use emoji: "⚠️ Tasks or execution blueprint not found. Generating tasks automatically..."
- Error message should use emoji: "❌ Error: Automatic task generation failed."
- Maintain all existing sections and content - only add/modify the three specified areas

</details>
