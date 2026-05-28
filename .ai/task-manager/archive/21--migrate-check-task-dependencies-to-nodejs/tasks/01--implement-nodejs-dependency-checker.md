---
id: 1
group: "implementation"
dependencies: []
status: "completed"
created: "2025-09-08"
skills: ["nodejs", "typescript"]
---

## Objective
Implement a Node.js script that replicates all functionality of the existing `check-task-dependencies.sh` bash script, maintaining identical CLI interface, output formatting, and exit codes.

## Skills Required
- **nodejs**: Core Node.js development for file system operations and CLI functionality
- **typescript**: TypeScript implementation for better type safety and integration with existing codebase

## Acceptance Criteria
- [ ] Script accepts two CLI arguments: `<plan-id>` and `<task-id>`
- [ ] Locates plan directories using the same search patterns as bash script
- [ ] Parses YAML frontmatter from task files to extract dependencies and status
- [ ] Handles both padded (01, 02) and unpadded (1, 2) task ID matching
- [ ] Provides identical colored console output (red errors, green success, yellow warnings)
- [ ] Returns same exit codes: 0 for success, 1 for failure
- [ ] Validates all task dependencies are completed before allowing execution
- [ ] Displays dependency summary with resolved/unresolved counts

## Technical Requirements
- Use existing project dependencies: `chalk` for colors, `fs-extra` for file operations
- Implement as `check-task-dependencies.cjs` in `templates/ai-task-manager/config/scripts/`
- Parse YAML frontmatter using native JavaScript (no additional YAML libraries)
- Handle both array syntax `[item1, item2]` and list syntax `- item1` for dependencies
- Use Node.js `path` module for cross-platform path handling
- Maintain synchronous execution model to match bash script behavior

## Input Dependencies
- Access to existing bash script for behavioral reference
- Project's existing dependencies (chalk, fs-extra, Node.js built-ins)
- Understanding of current YAML frontmatter format in task files

## Output Artifacts
- `templates/ai-task-manager/config/scripts/check-task-dependencies.cjs`
- Executable Node.js script with identical functionality to bash version
- Preserved directory structure and file naming conventions

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

### CLI Argument Processing
```javascript
// Check for exactly 2 arguments (plan-id and task-id)
if (process.argv.length !== 4) {
    console.error("Invalid number of arguments");
    console.log("Usage: node check-task-dependencies.cjs <plan-id> <task-id>");
    console.log("Example: node check-task-dependencies.cjs 16 03");
    process.exit(1);
}
const planId = process.argv[2];
const taskId = process.argv[3];
```

### Plan Directory Location
Replicate bash `find` command logic:
```javascript
const fs = require('fs-extra');
const path = require('path');

function findPlanDirectory(planId) {
    const searchDirs = ['.ai/task-manager/plans', '.ai/task-manager/archive'];

    for (const searchDir of searchDirs) {
        if (!fs.existsSync(searchDir)) continue;

        const entries = fs.readdirSync(searchDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith(`${planId}--`)) {
                return path.join(searchDir, entry.name);
            }
        }
    }
    return null;
}
```

### Task File Location
Handle both padded and unpadded task IDs:
```javascript
function findTaskFile(planDir, taskId) {
    const tasksDir = path.join(planDir, 'tasks');
    if (!fs.existsSync(tasksDir)) return null;

    // Try direct match first: taskId--*.md
    const pattern1 = `${taskId}--`;
    // Try zero-padded: 0taskId--*.md
    const pattern2 = `0${taskId}--`;

    const files = fs.readdirSync(tasksDir);

    // Try exact match first
    let match = files.find(f => f.startsWith(pattern1) && f.endsWith('.md'));
    if (match) return path.join(tasksDir, match);

    // Try zero-padded
    match = files.find(f => f.startsWith(pattern2) && f.endsWith('.md'));
    if (match) return path.join(tasksDir, match);

    return null;
}
```

### YAML Frontmatter Parsing
Extract dependencies and status from frontmatter:
```javascript
function parseFrontmatter(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let inFrontmatter = false;
    let frontmatterEnd = false;
    const frontmatter = {};

    for (const line of lines) {
        if (line.trim() === '---') {
            if (!inFrontmatter) {
                inFrontmatter = true;
                continue;
            } else {
                frontmatterEnd = true;
                break;
            }
        }

        if (inFrontmatter && !frontmatterEnd) {
            // Parse dependencies: [item1, item2] or list format
            if (line.startsWith('dependencies:')) {
                const depLine = line.replace(/^dependencies:\s*/, '');
                if (depLine.includes('[') && depLine.includes(']')) {
                    // Array format: dependencies: [1, 2, 3]
                    const arrayMatch = depLine.match(/\[(.*)\]/);
                    if (arrayMatch) {
                        frontmatter.dependencies = arrayMatch[1]
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s && s !== '');
                    }
                }
                // Handle list format in subsequent lines if needed
            }

            // Parse status
            if (line.startsWith('status:')) {
                const status = line.replace(/^status:\s*/, '').replace(/['"]/g, '');
                frontmatter.status = status;
            }
        }
    }

    return frontmatter;
}
```

### Colored Output Functions
Using chalk to match bash script colors:
```javascript
const chalk = require('chalk');

function printError(message) {
    console.error(chalk.red(`ERROR: ${message}`));
}

function printSuccess(message) {
    console.log(chalk.green(`✓ ${message}`));
}

function printWarning(message) {
    console.log(chalk.yellow(`⚠ ${message}`));
}

function printInfo(message) {
    console.log(message);
}
```

### Main Execution Flow
1. Validate CLI arguments
2. Find plan directory
3. Find task file
4. Parse task frontmatter for dependencies
5. If no dependencies, exit success
6. For each dependency, find dependency task file and check status
7. Display summary and exit with appropriate code

### Error Handling
- Exit 1 for missing plans, tasks, or unresolved dependencies
- Exit 0 only when all dependencies are "completed" status
- Provide descriptive error messages matching bash script format

</details>