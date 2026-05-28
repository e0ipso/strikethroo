---
id: 3
group: "remove-detection-infrastructure"
dependencies: [1, 2]
status: "pending"
created: "2025-12-29"
skills: ["bash"]
---

# Verify and Remove Detection Scripts

## Objective

Confirm that no remaining references to `detect-assistant.cjs` and `read-assistant-config.cjs` exist in the codebase, then delete the obsolete script files from both the active and template directories.

## Skills Required

- **bash**: Script verification, grep searches, file deletion

## Acceptance Criteria

- [ ] Comprehensive search confirms zero references to `detect-assistant.cjs` in codebase
- [ ] Comprehensive search confirms zero references to `read-assistant-config.cjs` in codebase
- [ ] All detection script references checked in:
  - Template files (`.claude/`, `.gemini/`, `.cursor/`, `.codex/`)
  - Hook files (`.ai/task-manager/config/hooks/`)
  - Documentation (`AGENTS.md`, `README.md`, etc.)
  - Source code (`src/` directory)
- [ ] `/workspace/.ai/task-manager/config/scripts/detect-assistant.cjs` deleted
- [ ] `/workspace/.ai/task-manager/config/scripts/read-assistant-config.cjs` deleted
- [ ] `/workspace/templates/ai-task-manager/config/scripts/detect-assistant.cjs` deleted
- [ ] `/workspace/templates/ai-task-manager/config/scripts/read-assistant-config.cjs` deleted
- [ ] All tests pass (if any tests reference these scripts, update them)
- [ ] Verification summary documented

## Technical Requirements

Scripts to remove:
- `/workspace/.ai/task-manager/config/scripts/detect-assistant.cjs`
- `/workspace/.ai/task-manager/config/scripts/read-assistant-config.cjs`
- `/workspace/templates/ai-task-manager/config/scripts/detect-assistant.cjs`
- `/workspace/templates/ai-task-manager/config/scripts/read-assistant-config.cjs`

Search patterns to verify removal:
- `detect-assistant.cjs`
- `read-assistant-config.cjs`
- `detect-assistant` (function/command references)
- `read-assistant-config` (function/command references)

## Input Dependencies

- Completed updates from Tasks 1 and 2
- All templates and hooks already updated to remove detection references

## Output Artifacts

- Verification report (list of files checked and results)
- Detection scripts deleted from filesystem
- Clean git status confirming removal

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Comprehensive Verification Search

Run these searches to confirm complete removal:

```bash
# Search for script name references
echo "=== Searching for detect-assistant.cjs references ==="
grep -r "detect-assistant.cjs" /workspace --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | grep -v "Binary file" || echo "✓ No references found"

echo "=== Searching for read-assistant-config.cjs references ==="
grep -r "read-assistant-config.cjs" /workspace --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | grep -v "Binary file" || echo "✓ No references found"

# Search for function/command references (no .cjs extension)
echo "=== Searching for detect-assistant function references ==="
grep -r "detect-assistant" /workspace --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | grep -v ".cjs:" | grep -v "Binary file" || echo "✓ No function references found"

echo "=== Searching for read-assistant-config function references ==="
grep -r "read-assistant-config" /workspace --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | grep -v ".cjs:" | grep -v "Binary file" || echo "✓ No function references found"
```

### Step 2: Check Specific Locations

Verify these specific locations for any detection references:

1. **Template Files** (all assistant directories):
   - `.claude/commands/tasks/*.md`
   - `.gemini/commands/tasks/*.toml`
   - `.cursor/commands/tasks/*.md`
   - `.codex/prompts/*.md`
   - `/workspace/templates/assistant/commands/tasks/*.md`

2. **Hook Files**:
   - `/workspace/.ai/task-manager/config/hooks/*.md`

3. **Documentation**:
   - `/workspace/AGENTS.md`
   - `/workspace/README.md`
   - Any `.md` files in `/workspace/templates/`

4. **Source Code** (if applicable):
   - `/workspace/src/**/*.ts`
   - `/workspace/src/**/*.js`

### Step 3: Check Tests

Search test files for any references to detection scripts:

```bash
grep -r "detect-assistant\|read-assistant-config" /workspace/src/__tests__/ 2>/dev/null || echo "✓ No test references found"
```

If tests reference these scripts, update them to reflect the new direct loading approach.

### Step 4: File Deletion

Once verification confirms zero references, delete the scripts:

```bash
# Delete from active directory
rm -f /workspace/.ai/task-manager/config/scripts/detect-assistant.cjs
rm -f /workspace/.ai/task-manager/config/scripts/read-assistant-config.cjs

# Delete from template directory
rm -f /workspace/templates/ai-task-manager/config/scripts/detect-assistant.cjs
rm -f /workspace/templates/ai-task-manager/config/scripts/read-assistant-config.cjs
```

### Step 5: Verify Deletion and Run Tests

Confirm files are deleted:
```bash
ls -la /workspace/.ai/task-manager/config/scripts/ | grep -E "detect-assistant|read-assistant" || echo "✓ Scripts successfully removed from active directory"
ls -la /workspace/templates/ai-task-manager/config/scripts/ | grep -E "detect-assistant|read-assistant" || echo "✓ Scripts successfully removed from template directory"
```

Run test suite to ensure nothing broke:
```bash
npm test
```

### Step 6: Document Results

Create a summary of:
- Files checked
- Search results
- Scripts deleted
- Any issues encountered
- Tests status

This summary helps confirm the task is complete and provides a record of the cleanup.

</details>
