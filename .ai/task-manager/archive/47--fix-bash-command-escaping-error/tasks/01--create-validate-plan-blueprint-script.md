---
id: 1
group: "helper-scripts"
dependencies: []
status: "completed"
created: "2025-10-28"
skills:
  - nodejs
  - bash
---
# Create validate-plan-blueprint.cjs Script

## Objective

Create a Node.js script that validates a plan exists and checks for tasks and execution blueprint, replacing the problematic multi-line bash command in execute-blueprint.md lines 49-64.

## Skills Required

- **nodejs**: Node.js scripting with fs and path modules
- **bash**: Understanding of shell operations being replaced

## Acceptance Criteria

- [ ] Script accepts plan ID as command-line argument (`process.argv[2]`)
- [ ] Script finds plan file in both `plans/` and `archive/` directories
- [ ] Script counts task files in the plan's tasks directory
- [ ] Script checks if execution blueprint section exists in plan file
- [ ] Script outputs JSON with: `planFile`, `planDir`, `taskCount`, `blueprintExists`
- [ ] Script includes proper error handling with descriptive messages
- [ ] Script follows the coding style of `get-next-plan-id.cjs`
- [ ] Script includes JSDoc documentation

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Location**: `templates/ai-task-manager/config/scripts/validate-plan-blueprint.cjs`

**Pattern to Follow**: Study `templates/ai-task-manager/config/scripts/get-next-plan-id.cjs` for:
- File structure and shebang (`#!/usr/bin/env node`)
- Error handling patterns
- Directory traversal logic
- Debug logging with `DEBUG` environment variable

**Output Format** (JSON):
```json
{
  "planFile": "/path/to/plan-XX--name/plan-XX--name.md",
  "planDir": "/path/to/plan-XX--name",
  "taskCount": 5,
  "blueprintExists": true
}
```

**Error Cases**:
- Plan ID not provided: Exit with error message
- Plan not found: Exit with error message listing available plans
- Invalid plan structure: Handle gracefully with meaningful errors

## Input Dependencies

- Existing script pattern from `get-next-plan-id.cjs`
- Understanding of plan directory structure (`.ai/task-manager/{plans,archive}/`)

## Output Artifacts

- `templates/ai-task-manager/config/scripts/validate-plan-blueprint.cjs` file

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Create File with Shebang and Imports
```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
```

### Step 2: Implement Plan Finder Function
Look at how `get-next-plan-id.cjs` traverses directories. You need to:
1. Find `.ai/task-manager` root by traversing up from cwd
2. Search both `plans/` and `archive/` directories
3. Match plan directory pattern: `[plan-id]--*` (e.g., `47--fix-bash-command-escaping-error`)
4. Search for plan file matching: `plan-[plan-id]--*.md`

### Step 3: Count Task Files
```javascript
const tasksDir = path.join(planDir, 'tasks');
if (fs.existsSync(tasksDir)) {
  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  taskCount = files.length;
}
```

### Step 4: Check for Blueprint Section
```javascript
const planContent = fs.readFileSync(planFile, 'utf8');
const blueprintExists = /^## Execution Blueprint/m.test(planContent);
```

### Step 5: Output JSON
```javascript
const result = {
  planFile,
  planDir,
  taskCount,
  blueprintExists
};
console.log(JSON.stringify(result, null, 2));
```

### Step 6: Error Handling
- Validate `process.argv[2]` exists
- Try-catch around file operations
- Provide helpful error messages with `console.error()`
- Use exit code 1 for errors: `process.exit(1)`

### Testing Locally
```bash
# Test with current plan
node templates/ai-task-manager/config/scripts/validate-plan-blueprint.cjs 47

# Expected output:
# {
#   "planFile": ".../.ai/task-manager/plans/47--fix-bash-command-escaping-error/plan-47--fix-bash-command-escaping-error.md",
#   "planDir": ".../.ai/task-manager/plans/47--fix-bash-command-escaping-error",
#   "taskCount": 0,
#   "blueprintExists": false
# }
```

</details>
