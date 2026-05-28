---
id: 2
group: "yaml-frontmatter-fix"
dependencies: []
status: "completed"
created: 2025-11-06
skills:
  - yaml
---
# Quote argument-hint Values in Template Frontmatter

## Objective

Add double quotes around all `argument-hint` values in the six command template files to fix YAML parsing errors in OpenCode's js-yaml parser.

## Skills Required

- YAML: Understanding of YAML syntax and when values need quoting

## Acceptance Criteria

- [ ] All six template files have quoted `argument-hint` values
- [ ] YAML frontmatter parses correctly in OpenCode
- [ ] No other frontmatter fields are affected
- [ ] All existing tests pass

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Files to Modify**:
1. `templates/assistant/commands/tasks/create-plan.md`
2. `templates/assistant/commands/tasks/execute-blueprint.md`
3. `templates/assistant/commands/tasks/execute-task.md`
4. `templates/assistant/commands/tasks/fix-broken-tests.md`
5. `templates/assistant/commands/tasks/full-workflow.md`
6. `templates/assistant/commands/tasks/generate-tasks.md`

**Current Values** (cause parsing error):
```yaml
argument-hint: [user-prompt]          # create-plan.md
argument-hint: [plan-ID]              # execute-blueprint.md, generate-tasks.md
argument-hint: [plan-ID] [task-ID]    # execute-task.md
argument-hint: [test-command]         # fix-broken-tests.md
```

**Required Values** (parse correctly):
```yaml
argument-hint: "[user-prompt]"
argument-hint: "[plan-ID]"
argument-hint: "[plan-ID] [task-ID]"
argument-hint: "[test-command]"
```

**Why This Fails**: In YAML, when a value starts with `[` followed by text and a space (like `[plan-ID] [task-ID]`), the parser interprets it as the beginning of a flow sequence or mapping, causing the error "can not read an implicit mapping pair; a colon is missed".

## Input Dependencies

None - this task is independent and can run in parallel with task 01.

## Output Artifacts

- Six modified template files with properly quoted YAML frontmatter
- OpenCode can successfully parse all command templates

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Approach

Use the Edit tool to modify each template file's YAML frontmatter, adding double quotes around the `argument-hint` value.

### Step-by-Step Implementation

1. **Read each template file** to verify current frontmatter structure

2. **Apply the edit** to each file's frontmatter:
   - Find: `argument-hint: [value]`
   - Replace: `argument-hint: "[value]"`

3. **Specific edits for each file**:

   **create-plan.md**:
   ```yaml
   # Before
   argument-hint: [user-prompt]
   # After
   argument-hint: "[user-prompt]"
   ```

   **execute-blueprint.md** and **generate-tasks.md**:
   ```yaml
   # Before
   argument-hint: [plan-ID]
   # After
   argument-hint: "[plan-ID]"
   ```

   **execute-task.md**:
   ```yaml
   # Before
   argument-hint: [plan-ID] [task-ID]
   # After
   argument-hint: "[plan-ID] [task-ID]"
   ```

   **fix-broken-tests.md**:
   ```yaml
   # Before
   argument-hint: [test-command]
   # After
   argument-hint: "[test-command]"
   ```

   **full-workflow.md**:
   ```yaml
   # Before
   argument-hint: [user-prompt]
   # After
   argument-hint: "[user-prompt]"
   ```

### Testing Verification

After implementation:
```bash
# Verify YAML can be parsed
npm run build
npm test

# Manual YAML validation (if needed)
node -e "const yaml = require('js-yaml'); const fs = require('fs'); const content = fs.readFileSync('templates/assistant/commands/tasks/execute-task.md', 'utf8'); const match = content.match(/^---\\n([\\s\\S]*?)\\n---/); if (match) { const parsed = yaml.load(match[1]); console.log('Parsed:', parsed); }"
```

### Edge Cases

- Ensure only the `argument-hint` field is modified, not the `description` field
- Verify that the quotes are double quotes (`"`) not single quotes (`'`)
- Confirm the rest of the frontmatter remains unchanged

### Claude/Gemini Compatibility

These changes are safe for all assistants:
- Claude uses Markdown format and will see the quoted values (no issue)
- Gemini receives TOML conversion where the quotes are handled correctly by the converter
- OpenCode gets the quoted YAML which parses correctly

</details>
