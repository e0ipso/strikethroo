---
id: 4
group: "template-updates"
dependencies: [2]
status: "completed"
created: "2025-10-28"
skills:
  - markdown
---
# Update generate-tasks.md Template

## Objective

Replace problematic multi-line bash command in generate-tasks.md with simple script invocation, eliminating the bash escaping error in the approval method extraction logic.

## Skills Required

- **markdown**: Template modification and documentation updates

## Acceptance Criteria

- [ ] Lines 305-314: Replace approval method extraction with `get-approval-methods.cjs` invocation
- [ ] Update prose to reference script output
- [ ] Maintain backward compatibility with workflow
- [ ] Preserve all other template content and structure
- [ ] Test that template instructions remain clear

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File**: `templates/assistant/commands/tasks/generate-tasks.md`

**Replacement (lines 305-314)** - Approval Method Extraction:

**Before**:
```bash
# Find plan file by ID
PLAN_FILE=$(find .ai/task-manager/{plans,archive} -name "plan-$1--*.md" -type f -exec grep -l "^id: \?$1$" {} \;)

# Extract approval_method_tasks from YAML frontmatter
APPROVAL_METHOD_TASKS=$(sed -n '/^---$/,/^---$/p' "$PLAN_FILE" | grep '^approval_method_tasks:' | sed 's/approval_method_tasks: *//;s/"//g' | tr -d " '")

# Default to "manual" if field doesn't exist (backward compatibility)
APPROVAL_METHOD_TASKS=${APPROVAL_METHOD_TASKS:-manual}
```

**After**:
```bash
# Extract approval method from plan metadata
APPROVAL_METHODS=$(node .ai/task-manager/config/scripts/get-approval-methods.cjs $1)

APPROVAL_METHOD_TASKS=$(echo "$APPROVAL_METHODS" | grep -o '"approval_method_tasks": "[^"]*"' | cut -d'"' -f4)

# Default to "manual" if field doesn't exist (backward compatibility)
APPROVAL_METHOD_TASKS=${APPROVAL_METHOD_TASKS:-manual}
```

## Input Dependencies

- Task 2: `get-approval-methods.cjs` script must exist

## Output Artifacts

- Updated `templates/assistant/commands/tasks/generate-tasks.md` with script invocation

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Locate the Section

Find the section with heading:
```markdown
**Extract approval method from plan metadata:**
```

This should be around lines 305-314 in the "Output Requirements" section.

### Step 2: Replace the Bash Block

The current bash block has multiple lines with:
1. `find` command to locate plan file
2. `sed` and `grep` pipeline to extract field
3. Default value assignment

Replace it with the simpler script invocation shown above.

### Step 3: Verify Context Preservation

**Before the replacement**, there's explanation text about:
- Context-aware output behavior
- Automated vs. manual workflow modes

**After the replacement**, there's conditional logic:
```markdown
Then adjust output based on the extracted approval method:

- **If `APPROVAL_METHOD_TASKS="auto"` (automated workflow mode)**:
  ...
```

Ensure this context remains intact and the variable `APPROVAL_METHOD_TASKS` is still properly set.

### Step 4: Note About approval_method_plan

The script outputs **both** approval method fields, but generate-tasks.md only uses `approval_method_tasks`. This is correct - the plan-level approval method is only used in execute-blueprint.md.

You don't need to extract `approval_method_plan` here.

### Step 5: Validate Changes

After editing:
```bash
# Check the file structure
grep -A 5 "Extract approval method" templates/assistant/commands/tasks/generate-tasks.md

# Ensure no remaining multi-line command substitutions
grep -n '\$(' templates/assistant/commands/tasks/generate-tasks.md | grep -v "node .ai"
```

The only command substitutions should be the script invocations.

### Alternative Simpler Approach

If the JSON parsing seems complex, you could use `jq` if available, but that adds a dependency. The `grep`/`cut` approach is more portable and matches the style of existing scripts.

</details>
