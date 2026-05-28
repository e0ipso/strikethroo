---
id: 2
group: "toml-escaping"
dependencies: [1]
status: "completed"
created: 2025-12-19
skills: ["typescript"]
---

# Task 02: Regenerate Gemini TOML Command Files

## Objective

Regenerate all Gemini TOML command files in `.gemini/commands/tasks/` using the corrected escape function to produce valid TOML with proper newlines.

## Acceptance Criteria

- [ ] All 7 TOML files regenerated: `create-plan`, `refine-plan`, `generate-tasks`, `execute-task`, `execute-blueprint`, `fix-broken-tests`, `full-workflow`
- [ ] Generated files contain actual newlines (not `\n` escape sequences)
- [ ] All `.toml` files are syntactically valid
- [ ] Files are byte-identical to what CLI would generate on fresh init
- [ ] Timestamps updated to current date

## Technical Requirements

**Files to regenerate**: `.gemini/commands/tasks/*.toml`

**Regeneration method**: Run init command with Gemini assistant to regenerate files using corrected code

**Validation**: Manually verify 1-2 files that content contains real newlines, not escaped ones

<details>
<summary>Implementation Notes</summary>

### Step 1: Build the project with fixes

Ensure Task 01 is complete first, then build:
```bash
npm run build
```

### Step 2: Regenerate TOML files

Option A - Full regeneration (recommended):
```bash
npm start init --assistants gemini --force
```

This will regenerate all files in `.gemini/commands/tasks/` using the corrected `convertMdToToml` function.

Option B - Verify specific regeneration manually (alternative):
If you want to spot-check the process:
1. Look at a single `.toml` file being generated
2. View generated content to verify newlines are present
3. Check that `{{args}}` and `{{plan_id}}` placeholders are preserved

### Step 3: Validate regenerated files

Check one regenerated file to verify newlines work:
```bash
# View a small section of a regenerated file
head -50 .gemini/commands/tasks/create-plan.toml | tail -20

# Look for actual line breaks in the content field, not \n sequences
# You should see:
# content = """# Comprehensive Plan Creation
#
# You are a strategic planning specialist...
#
# NOT:
# content = """# Comprehensive Plan Creation\n\nYou are a strategic planning specialist\n...
```

### Step 4: Verify all 7 files exist and have content

```bash
ls -lh .gemini/commands/tasks/
# Should show exactly 7 .toml files with reasonable sizes (3-20KB each)
```

### Technical Details

The files being regenerated are:
1. `create-plan.toml` - Main plan creation command
2. `refine-plan.toml` - Plan refinement command
3. `generate-tasks.toml` - Task generation command
4. `execute-task.toml` - Single task execution
5. `execute-blueprint.toml` - Full blueprint execution
6. `fix-broken-tests.toml` - Test fixing command
7. `full-workflow.toml` - Complete workflow command

Each file will contain:
- `[metadata]` section with command description
- `[prompt]` section with actual markdown content (no escaped newlines)

### Why Regeneration Matters

The old files have literal `\n` sequences in their content which don't display as newlines when Gemini parses them. When Gemini reads these files, it sees:

```
# Comprehensive Plan Creation\n\nYou are a strategic planning specialist...
```

Instead of:
```
# Comprehensive Plan Creation

You are a strategic planning specialist...
```

The regeneration with the fixed function will create files with proper newlines, making the commands parseable and usable by Gemini.

</details>

## Success Validation

After regeneration:
1. Verify files were created with current timestamp
2. Check that at least one file contains actual newlines (not `\n` strings)
3. Confirm file sizes are reasonable (typically 3-20KB each)
4. Run `npm test` to ensure no regression

## Input Dependencies

- Task 01 must be completed and `npm run build` must succeed
- Existing markdown templates in `templates/commands/tasks/` directory
- `.gemini/commands/tasks/` directory exists

## Output Artifacts

- 7 regenerated TOML files in `.gemini/commands/tasks/` with corrected newline handling
- All files passing basic validation (exist, non-empty, proper structure)
- Verification that content contains actual newlines, not escape sequences
