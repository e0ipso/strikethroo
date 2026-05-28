---
id: 2
group: "helper-scripts"
dependencies: []
status: "completed"
created: "2025-10-28"
skills:
  - nodejs
---
# Create get-approval-methods.cjs Script

## Objective

Create a Node.js script that extracts `approval_method_plan` and `approval_method_tasks` fields from plan frontmatter, replacing the problematic multi-line bash commands in execute-blueprint.md (lines 156-167) and generate-tasks.md (lines 305-314).

## Skills Required

- **nodejs**: Node.js scripting with fs module and YAML frontmatter parsing

## Acceptance Criteria

- [ ] Script accepts plan ID as command-line argument
- [ ] Script locates plan file by ID in `plans/` or `archive/` directories
- [ ] Script extracts both `approval_method_plan` and `approval_method_tasks` from YAML frontmatter
- [ ] Script defaults to "manual" if fields don't exist (backward compatibility)
- [ ] Script outputs JSON with both approval method fields
- [ ] Script includes proper error handling
- [ ] Script follows existing script patterns

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**Location**: `templates/ai-task-manager/config/scripts/get-approval-methods.cjs`

**Output Format** (JSON):
```json
{
  "approval_method_plan": "manual",
  "approval_method_tasks": "auto"
}
```

**YAML Frontmatter Parsing**: Use regex-based extraction (no dependencies):
```javascript
// Extract frontmatter between --- markers
const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (frontmatterMatch) {
  const frontmatter = frontmatterMatch[1];
  // Extract each field
  const planMatch = frontmatter.match(/^approval_method_plan:\s*(.+)$/m);
  const tasksMatch = frontmatter.match(/^approval_method_tasks:\s*(.+)$/m);
}
```

**Default Values**: Return "manual" for any missing fields

## Input Dependencies

- Existing script patterns from `get-next-plan-id.cjs` for plan finding logic
- Plan file structure with YAML frontmatter

## Output Artifacts

- `templates/ai-task-manager/config/scripts/get-approval-methods.cjs` file

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Set Up Script Structure
```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get plan ID from command line
const planId = process.argv[2];
if (!planId) {
  console.error('Error: Plan ID is required');
  console.error('Usage: node get-approval-methods.cjs <plan-id>');
  process.exit(1);
}
```

### Step 2: Find Plan File
Reuse logic from task 1 or `get-next-plan-id.cjs`:
1. Find `.ai/task-manager` root
2. Search `plans/` and `archive/` directories
3. Match plan file: `plan-[plan-id]--*.md`

You can extract this into a shared helper function if desired.

### Step 3: Parse YAML Frontmatter
```javascript
const content = fs.readFileSync(planFile, 'utf8');

// Extract YAML frontmatter
const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
const match = content.match(frontmatterRegex);

if (!match) {
  console.error('Error: No YAML frontmatter found in plan file');
  process.exit(1);
}

const frontmatter = match[1];
```

### Step 4: Extract Approval Method Fields
```javascript
function extractField(frontmatter, fieldName, defaultValue = 'manual') {
  const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm');
  const match = frontmatter.match(regex);

  if (!match) return defaultValue;

  // Clean up value: remove quotes and trim
  let value = match[1].trim();
  value = value.replace(/^['"]|['"]$/g, '');

  return value || defaultValue;
}

const approvalMethodPlan = extractField(frontmatter, 'approval_method_plan');
const approvalMethodTasks = extractField(frontmatter, 'approval_method_tasks');
```

### Step 5: Output JSON
```javascript
const result = {
  approval_method_plan: approvalMethodPlan,
  approval_method_tasks: approvalMethodTasks
};

console.log(JSON.stringify(result, null, 2));
```

### Testing Locally
```bash
# Test with plan 47
node templates/ai-task-manager/config/scripts/get-approval-methods.cjs 47

# Expected output:
# {
#   "approval_method_plan": "manual",
#   "approval_method_tasks": "manual"
# }
```

### Edge Cases to Handle
- Missing approval method fields (default to "manual")
- Quoted values: `approval_method_plan: "auto"` or `approval_method_plan: 'auto'`
- Unquoted values: `approval_method_plan: auto`
- Extra whitespace: `approval_method_plan:   manual  `

</details>
