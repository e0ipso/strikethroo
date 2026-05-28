---
id: 3
group: "template-updates"
dependencies: [1, 2]
status: "completed"
created: "2025-10-28"
skills:
  - markdown
---
# Update execute-blueprint.md Template

## Objective

Replace problematic multi-line bash commands in execute-blueprint.md with simple script invocations, eliminating the bash escaping errors.

## Skills Required

- **markdown**: Template modification and documentation updates

## Acceptance Criteria

- [ ] Lines 49-64: Replace plan validation logic with `validate-plan-blueprint.cjs` invocation
- [ ] Lines 156-167: Replace approval method extraction with `get-approval-methods.cjs` invocation
- [ ] Update surrounding prose to reference script outputs
- [ ] Maintain backward compatibility with workflow
- [ ] Preserve all other template content and structure
- [ ] Test that template instructions are clear for Claude to execute

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File**: `templates/assistant/commands/tasks/execute-blueprint.md`

**Replacement 1 (lines 49-64)** - Task and Blueprint Validation:

**Before**:
```bash
PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-[0-9][0-9]*--*.md" -type f -exec grep -l "^id: \?$1$" {} \;)
PLAN_DIR=$(dirname "$PLAN_FILE")
# ... more multi-line commands
```

**After**:
```bash
# Validate plan exists and check for tasks/blueprint
VALIDATION=$(node .ai/task-manager/config/scripts/validate-plan-blueprint.cjs $1)

# Parse validation results
PLAN_FILE=$(echo "$VALIDATION" | grep -o '"planFile": "[^"]*"' | cut -d'"' -f4)
PLAN_DIR=$(echo "$VALIDATION" | grep -o '"planDir": "[^"]*"' | cut -d'"' -f4)
TASK_COUNT=$(echo "$VALIDATION" | grep -o '"taskCount": [0-9]*' | awk '{print $2}')
BLUEPRINT_EXISTS=$(echo "$VALIDATION" | grep -o '"blueprintExists": [a-z]*' | awk '{print $2}')
```

**Replacement 2 (lines 156-167)** - Approval Method Extraction:

**Before**:
```bash
PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-$1--*.md" -type f -exec grep -l "^id: \?$1$" {} \;)
APPROVAL_METHOD_PLAN=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_plan:' ...)
APPROVAL_METHOD_TASKS=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_tasks:' ...)
```

**After**:
```bash
# Extract approval methods from plan metadata
APPROVAL_METHODS=$(node .ai/task-manager/config/scripts/get-approval-methods.cjs $1)

APPROVAL_METHOD_PLAN=$(echo "$APPROVAL_METHODS" | grep -o '"approval_method_plan": "[^"]*"' | cut -d'"' -f4)
APPROVAL_METHOD_TASKS=$(echo "$APPROVAL_METHODS" | grep -o '"approval_method_tasks": "[^"]*"' | cut -d'"' -f4)

# Defaults to "manual" if fields don't exist
APPROVAL_METHOD_PLAN=${APPROVAL_METHOD_PLAN:-manual}
APPROVAL_METHOD_TASKS=${APPROVAL_METHOD_TASKS:-manual}
```

## Input Dependencies

- Task 1: `validate-plan-blueprint.cjs` script must exist
- Task 2: `get-approval-methods.cjs` script must exist

## Output Artifacts

- Updated `templates/assistant/commands/tasks/execute-blueprint.md` with script invocations

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Read Current Template
```bash
cat templates/assistant/commands/tasks/execute-blueprint.md
```

Identify the exact line ranges for both replacements.

### Step 2: Update Validation Section (lines ~49-64)

Find this section heading:
```markdown
### Task and Blueprint Validation
```

Replace the multi-line bash block with the script invocation pattern shown above.

**Important**: Keep the surrounding context:
- The section explanation before the code block
- The conditional logic after (`if either $TASK_COUNT is 0 or $BLUEPRINT_EXISTS is "no"`)
- The automatic task generation workflow

### Step 3: Update Approval Method Section (lines ~156-167)

Find this section heading:
```markdown
**Extract approval method from plan metadata:**
```

Replace the multi-line bash block with the script invocation pattern.

**Important**: Preserve:
- The explanation about automated vs. manual workflow modes
- The conditional output behavior based on approval methods
- All subsequent usage of `APPROVAL_METHOD_PLAN` and `APPROVAL_METHOD_TASKS`

### Step 4: Verify JSON Parsing Logic

The JSON parsing uses standard bash commands:
- `grep -o` to extract key-value pairs
- `cut -d'"' -f4` to get the value between quotes
- `awk '{print $2}'` for numeric values

These patterns are safe and don't have the escaping issues.

### Step 5: Test Template Clarity

Read through the updated sections and ensure:
- Claude can understand the script invocation instructions
- The JSON parsing steps are clear
- Variable usage downstream still makes sense
- No broken references to old variable names

### Manual Validation

After editing, manually verify:
```bash
# Check line counts haven't changed dramatically
wc -l templates/assistant/commands/tasks/execute-blueprint.md

# Search for any remaining problematic patterns
grep -n '\$(' templates/assistant/commands/tasks/execute-blueprint.md | head -20
```

The script invocations should be the only command substitutions, and they're single-line.

</details>
