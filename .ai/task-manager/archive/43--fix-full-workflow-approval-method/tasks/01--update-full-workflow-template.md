---
id: 1
group: "template-fixes"
dependencies: []
status: "completed"
created: 2025-10-19
skills:
  - bash
  - nodejs
---
# Update Full-Workflow Template with Cross-Platform Fixes

## Objective

Modify `templates/assistant/commands/tasks/full-workflow.md` to fix sed cross-platform compatibility and implement dynamic plan ID variable substitution throughout all workflow steps.

## Skills Required

- **bash**: Shell scripting for variable capture and command sequencing
- **nodejs**: Inline Node.js scripting for cross-platform YAML frontmatter manipulation

## Acceptance Criteria

- [ ] Step 1 modified to store plan ID in `PLAN_ID` shell variable
- [ ] Step 3 sed commands replaced with Node.js inline script for frontmatter updates
- [ ] All `[plan-id]` placeholders in Steps 3-6 replaced with `${PLAN_ID}` variable references
- [ ] Node.js script handles both add and update scenarios for `approval_method` field
- [ ] Template syntax remains valid for Markdown format
- [ ] No trailing spaces or formatting issues introduced

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to modify**: `templates/assistant/commands/tasks/full-workflow.md`

**Specific changes**:

1. **Step 1 (line ~47-49)**: Change from:
   ```bash
   node .ai/task-manager/config/scripts/get-next-plan-id.cjs
   ```
   To:
   ```bash
   PLAN_ID=$(node .ai/task-manager/config/scripts/get-next-plan-id.cjs)
   ```

2. **Step 3 (lines ~84-91)**: Replace sed commands with Node.js inline script:
   ```bash
   # Replace the entire sed block with:
   if ! grep -q "^approval_method:" "$PLAN_FILE"; then
     node -e "
       const fs = require('fs');
       const content = fs.readFileSync('$PLAN_FILE', 'utf8');
       const updated = content.replace(/(^created: .+$)/m, '\$1\napproval_method: auto');
       fs.writeFileSync('$PLAN_FILE', updated, 'utf8');
     "
   else
     node -e "
       const fs = require('fs');
       const content = fs.readFileSync('$PLAN_FILE', 'utf8');
       const updated = content.replace(/^approval_method: .*/m, 'approval_method: auto');
       fs.writeFileSync('$PLAN_FILE', updated, 'utf8');
     "
   fi
   ```

3. **Steps 3-6**: Replace all literal `[plan-id]` with `${PLAN_ID}`:
   - Line 74: `grep -l "^id: \?[plan-id]$"` → `grep -l "^id: \?${PLAN_ID}$"`
   - Line 78: `Expected plan with ID [plan-id]` → `Expected plan with ID ${PLAN_ID}`
   - Line 101: `/tasks:generate-tasks [plan-id]` → `/tasks:generate-tasks ${PLAN_ID}`
   - Line 105: `for plan [plan-id]` → `for plan ${PLAN_ID}`
   - Line 111: `/tasks:execute-blueprint [plan-id]` → `/tasks:execute-blueprint ${PLAN_ID}`
   - Lines 127-137: All `[plan-id]` and `[plan-name]` references in summary output

## Input Dependencies

None - this is the first task in the plan.

## Output Artifacts

- Modified `templates/assistant/commands/tasks/full-workflow.md` with:
  - Cross-platform compatible YAML frontmatter modification logic
  - Dynamic plan ID variable capture and substitution
  - All placeholder text replaced with actual variable references

<details>
<summary>Implementation Notes</summary>

### Detailed Implementation Steps

1. **Open the template file**:
   ```bash
   templates/assistant/commands/tasks/full-workflow.md
   ```

2. **Update Step 1 (Determine Next Plan ID section)**:
   - Locate the bash code block around line 47-49
   - Modify the command to capture output into `PLAN_ID` variable
   - The variable will be used throughout the remaining steps

3. **Replace sed logic in Step 3 (Validate Plan Creation section)**:
   - Locate lines 84-91 containing sed commands with `.bak` extension
   - **Critical**: The sed commands use `-i.bak` which behaves differently on Linux/macOS
   - Replace with Node.js inline scripts that:
     - Use `fs.readFileSync` and `fs.writeFileSync` for file operations
     - Use regex `.replace()` for YAML frontmatter modification
     - Handle both scenarios: adding new field vs updating existing field
   - **Important**: Keep the `grep -q` check to determine which branch to execute
   - **Note**: The `$1` in regex is escaped as `\$1` in the Node.js inline script

4. **Global placeholder replacement**:
   - Search for all occurrences of `[plan-id]` in the file
   - Replace with `${PLAN_ID}` to reference the captured variable
   - **Watch for**: Both grep commands and text output strings need updating
   - **Verify**: SlashCommand tool invocations use the variable correctly

5. **Handle summary output placeholders**:
   - The Step 6 summary contains `[plan-id]--[plan-name]` patterns
   - These need to dynamically construct paths using the variable
   - Consider that `[plan-name]` is the slugified plan title (e.g., `fix-full-workflow-approval-method`)
   - You may need to extract plan name from the found plan file path

6. **Preserve file formatting**:
   - Do not add trailing spaces
   - Maintain consistent indentation (2 spaces for nested content)
   - Ensure file ends with a single newline
   - Keep all existing comments and documentation

### Edge Cases to Handle

- **Empty or missing PLAN_ID**: The variable should always have a value from Step 1
- **Plan file not found**: Step 3 already has error handling for this
- **Malformed frontmatter**: Node.js script assumes standard YAML format
- **SlashCommand tool context**: Ensure variable is in scope when commands execute

### Verification Approach

After making changes:
1. Visually inspect that no `[plan-id]` literal text remains (except in documentation/comments)
2. Check that `PLAN_ID` variable is assigned before it's used
3. Verify Node.js inline script syntax is correct (proper escaping)
4. Confirm all bash blocks are properly closed

</details>
