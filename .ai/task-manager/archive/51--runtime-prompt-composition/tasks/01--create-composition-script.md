---
id: 1
group: "composition-infrastructure"
dependencies: []
status: "completed"
created: 2025-11-04
skills:
  - nodejs
  - bash
---
# Create Runtime Prompt Composition Script

## Objective
Create a Node.js CommonJS script that reads markdown command files, performs variable substitution, and outputs composed prompts to enable uninterrupted workflow execution.

## Skills Required
- **nodejs**: File operations, argument parsing, and markdown processing
- **bash**: Script execution and integration with existing bash-based workflows

## Acceptance Criteria
- [ ] Script accepts command template paths and variable mappings as arguments
- [ ] Script reads markdown files and extracts frontmatter and body content
- [ ] Script performs variable substitution ($ARGUMENTS, $1, etc.)
- [ ] Script outputs composed prompt to stdout
- [ ] Script handles errors gracefully with clear error messages
- [ ] Script works with the existing template directory structure

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **File Location**: `templates/ai-task-manager/config/scripts/compose-prompt.cjs`
- **Execution Pattern**: `node compose-prompt.cjs --template "create-plan.md" --variable "ARGUMENTS=user input" --variable "1=51"`
- **Input**: Template file paths relative to `.claude/commands/tasks/` or `.ai/task-manager/config/`
- **Output**: Composed markdown prompt to stdout
- **Error Handling**: Exit code 1 on errors with stderr output

## Input Dependencies
- Existing template files in `templates/assistant/commands/tasks/`
- Existing `parseFrontmatter` patterns from `src/utils.ts` as reference

## Output Artifacts
- `templates/ai-task-manager/config/scripts/compose-prompt.cjs`
- Executable script that can be invoked by orchestrator commands

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Script Structure
```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Parse command line arguments
// --template: relative path to template file
// --variable: key=value pairs for substitution

// Read template file from appropriate directory
// Priority: .claude/commands/tasks/ then templates/assistant/commands/tasks/

// Extract frontmatter using regex similar to src/utils.ts parseFrontmatter

// Perform variable substitution
// $ARGUMENTS → value from --variable ARGUMENTS=...
// $1 → value from --variable 1=...

// Output composed content to stdout
```

### Variable Substitution Logic
- Replace `$ARGUMENTS` with provided value
- Replace `$1`, `$2`, etc. with positional arguments
- Preserve markdown structure and formatting
- Do NOT process frontmatter variables (those stay as-is)

### Error Handling
- Validate template file exists before reading
- Check all required variables are provided
- Provide helpful error messages: "Template not found: create-plan.md"
- Exit with code 1 on any error

### Testing
After implementation, test with:
```bash
node templates/ai-task-manager/config/scripts/compose-prompt.cjs \
  --template "create-plan.md" \
  --variable "ARGUMENTS=Build a REST API"
```

Expected output: Full create-plan.md content with $ARGUMENTS replaced

</details>
