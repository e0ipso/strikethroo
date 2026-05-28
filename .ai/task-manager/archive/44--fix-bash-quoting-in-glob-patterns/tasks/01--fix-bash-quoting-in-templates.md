---
id: 1
group: "template-fixes"
dependencies: []
status: "completed"
created: "2025-10-19"
skills:
  - bash
---

# Fix Bash Quoting in Template Files

## Objective

Update all template files (both source and generated) to fix bash quoting in glob patterns, changing from `"$PLAN_DIR"/tasks/*.md` to `${PLAN_DIR}/tasks/*.md` to resolve ZSH parsing errors.

## Skills Required

- **bash**: Understanding of bash/ZSH quoting rules, glob patterns, and command substitution behavior

## Acceptance Criteria

- [ ] All instances of `"$PLAN_DIR"/tasks/*.md` are replaced with `${PLAN_DIR}/tasks/*.md` in source templates
- [ ] All instances of `"$PLAN_DIR"/tasks/*.md` are replaced with `${PLAN_DIR}/tasks/*.md` in generated command files
- [ ] Similar patterns with `"$PLAN_FILE"` or other quoted variables in glob contexts are also fixed
- [ ] No instances of the problematic pattern remain in any template files
- [ ] All affected files use consistent unquoted variable expansion syntax

## Technical Requirements

**Files to update:**

1. **Source templates** (in `templates/assistant/commands/tasks/`):
   - `execute-blueprint.md` (lines ~50-56, ~151)
   - `generate-tasks.md` (line ~307)

2. **Generated command files** (in `.claude/commands/tasks/`, `.gemini/commands/tasks/`, `.opencode/command/tasks/`):
   - `execute-blueprint.md` / `execute-blueprint.toml`
   - `generate-tasks.md` / `generate-tasks.toml`

**Pattern to find and replace:**

```bash
# Find pattern
"$PLAN_DIR"/tasks/*.md

# Replace with
${PLAN_DIR}/tasks/*.md
```

**Additional patterns to check:**
- `"$PLAN_FILE"` in glob contexts
- Any other quoted variable expansion within glob patterns

## Input Dependencies

- Plan 44 document (already created)
- Existing template files in the codebase

## Output Artifacts

- Updated source template files with corrected bash syntax
- Updated generated command files with corrected bash syntax
- Consistent quoting pattern across all template files

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate All Affected Files

First, find all template files that contain the problematic pattern:

```bash
# Search for the pattern in source templates
grep -r '"$PLAN_DIR"' templates/assistant/commands/tasks/

# Search for the pattern in generated files
grep -r '"$PLAN_DIR"' .claude/commands/tasks/
grep -r '"$PLAN_DIR"' .gemini/commands/tasks/ 2>/dev/null || true
grep -r '"$PLAN_DIR"' .opencode/command/tasks/ 2>/dev/null || true
```

### Step 2: Update Source Templates

Edit these files in `templates/assistant/commands/tasks/`:

1. Open `execute-blueprint.md`
   - Look for lines around 50-56 and 151
   - Replace `"$PLAN_DIR"/tasks/*.md` with `${PLAN_DIR}/tasks/*.md`
   - Replace any similar patterns with quoted variables in glob contexts

2. Open `generate-tasks.md`
   - Look for line around 307
   - Replace `"$PLAN_DIR"/tasks/*.md` with `${PLAN_DIR}/tasks/*.md`

**Find and replace pattern:**
- Find: `"$PLAN_DIR"/tasks/\*.md`
- Replace: `${PLAN_DIR}/tasks/*.md`

### Step 3: Update Generated Command Files

Apply the same changes to generated files:

1. `.claude/commands/tasks/execute-blueprint.md`
2. `.claude/commands/tasks/generate-tasks.md`
3. `.gemini/commands/tasks/execute-blueprint.toml` (if exists)
4. `.gemini/commands/tasks/generate-tasks.toml` (if exists)
5. `.opencode/command/tasks/execute-blueprint.md` (if exists)
6. `.opencode/command/tasks/generate-tasks.md` (if exists)

**Note:** For TOML files, the syntax might be slightly different, but the same principle applies - remove quotes around variable expansion in glob patterns.

### Step 4: Verify No Other Instances

Search for other potential instances of the problematic pattern:

```bash
# Check for any remaining instances
grep -r '"$PLAN_DIR"/' templates/ .claude/ .gemini/ .opencode/ 2>/dev/null | grep -v '.git'

# Check for similar patterns with other variables
grep -r '"$PLAN_FILE"/' templates/ .claude/ .gemini/ .opencode/ 2>/dev/null | grep -v '.git'
grep -r '"$[A-Z_]*"/' templates/ .claude/ .gemini/ .opencode/ 2>/dev/null | grep '*.md\|*.toml' | grep -v '.git'
```

### Step 5: Document Changes

Keep track of all files modified and the number of replacements made in each file.

### Important Notes

- **Preserve other quoting**: Only remove quotes from variables used in glob patterns within command substitution. Keep quotes for variables used in other contexts (e.g., `dirname "$PLAN_FILE"` should remain quoted).
- **Shell compatibility**: The fix `${PLAN_DIR}/tasks/*.md` works in both bash and ZSH environments.
- **No spaces in paths**: The task manager enforces slug-based naming (no spaces) for all plan/task directories, so removing quotes is safe.

### Verification Before Committing

After making all changes, verify the syntax is correct:

```bash
# Count instances before fix (should be >0)
grep -r '"$PLAN_DIR"/tasks/\*.md' templates/ .claude/ 2>/dev/null | wc -l

# Count instances after fix (should be 0)
grep -r '"$PLAN_DIR"/tasks/\*.md' templates/ .claude/ 2>/dev/null | wc -l

# Verify new pattern is present
grep -r '\${PLAN_DIR}/tasks/\*.md' templates/ .claude/ 2>/dev/null | wc -l
```

</details>
